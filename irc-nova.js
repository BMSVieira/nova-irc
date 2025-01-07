const net = require('net');
const tls = require('tls');
const EventEmitter = require('events');

// Extra modules
const novaCodes = require('./nova-irc-codes');
var novaColors = require('./nova-strip-colors');

class novaIRC extends EventEmitter {

    constructor() {
        super();
        this.client = null;
        this.nickname = null;
        this.username = null;
        this.password = null;
        this.lastPingTime = Date.now();
        this.messageColor = null;
        this.pingInterval = 8 * 60 * 1000; // 8 minutes in milliseconds

        this.commandQueue = [];
        this.isProcessingQueue = false;
        this.floodProtectionDelay = 1000;
    }

    // Conectar ao Servidor (SSL Opcional, falso por defeito)
    connect(options = {}) {
        const {
            server = 'localhost',
                port = 6667,
                ssl = false,
                removeColors = true,
                messageColor = null,
                rejectUnauthorized = false,
        } = options;

        // Determina o tipo de conexão, baseado em SSL
        const connectionOptions = ssl ? {
            rejectUnauthorized
        } : {};
        this.client = ssl ?
            tls.connect(port, server, connectionOptions) :
            net.connect(port, server);

        // Define variables
        this.messageColor = messageColor;

        // Connect to server
        this.client.on('connect', () => {

            this.emit('connected');

            // Identifica-se
            this.sendRaw(`NICK ${this.nickname}`);
            this.sendRaw(`USER ${this.username} 0 * :Nova IRC Engine`);

            // Se tiver password, envia diretamente o IDENTIFY
            if (this.password) {
                this.sendRaw(`PRIVMSG NickServ :IDENTIFY ${this.password}`);
            }

        });

        // Verifica por uma request de Ping, se passar muito tempo, envia um Pong.
        this.startPingChecker();

        this.client.on('data', (data) => {
            const messages = data.toString().split('\r\n'); // Split into individual messages

            messages.forEach((message) => {
                if (!message) return;

                this.emit('raw', message);

                const parsedMessage = this.parseMessage(message, removeColors);
                if (!parsedMessage) {
                    console.error("Failed to parse message:", message);
                    return;
                }

                // Comando da mensagem
                const {
                    command,
                    params
                } = parsedMessage;

                switch (command) {
                    case 'rpl_yourhost':
                    case 'rpl_created':
                    case 'rpl_luserclient':
                    case 'rpl_luserop':
                    case 'rpl_luserchannels':
                    case 'rpl_luserme':
                    case 'rpl_localusers':
                    case 'rpl_globalusers':
                    case 'rpl_statsconn':
                    case 'rpl_luserunknown':
                    case 'rpl_welcome':
                    case 'rpl_myinfo':
                    case 'rpl_isupport':
                    case '396':
                    case '042':
                    case '376':
                    case '353':
                    case '366':
                    case 'rpl_endofbanlist':
                    case 'rpl_endofnames':
                        // Ignorar comandos inuteis.
                        break;
                    case 'rpl_motd':
                    case 'rpl_motdstart':
                    case 'rpl_endofmotd':
                        this.emit('motd', {
                            user: params[0],
                            content: params[1],
                            raw: message,
                        });
                        break;
                    case 'rpl_whoisuser':
                        this.emit('whoisUser', {
                            nick: params[1],
                            username: params[2],
                            host: params[3],
                            realName: params[5],
                            raw: message,
                        });
                        break;
                    case 'rpl_whoisserver':
                        this.emit('whoisServer', {
                            nick: params[1],
                            server: params[2],
                            serverInfo: params[3],
                            raw: message,
                        });
                        break;
                    case 'rpl_whoischannels':
                        this.emit('whoisChannels', {
                            nick: params[1],
                            channels: params[2],
                            raw: message,
                        });
                        break;
                    case 'rpl_whoisidle':
                        this.emit('whoisIdle', {
                            nick: params[1],
                            idleTime: params[2],
                            raw: message,
                        });
                        break;
                    case 'rpl_whoisoperator':
                        this.emit('whoisOperator', {
                            nick: params[1],
                            message: params[2],
                            raw: message,
                        });
                        break;

                    case 'rpl_endofwhois': // End of WHOIS
                        this.emit('whoisEnd', {
                            nick: params[1],
                            raw: message,
                        });
                        break;
                    case 'rpl_namreply':
                        
                        const channel = params[2];
                        const names = params[3].split(' ');

                        this.emit('names', {
                            channel,
                            names,
                            raw: message
                        });
                        break;
                    case 'rpl_banlist':
                        const [channelban, banMask, setBy, timestamp] = params;
                        this.emit('banlist', {
                            channelban,
                            banMask,
                            setBy,
                            timestamp
                        });
                        break;
                    case 'PING':
                        this.handlePing(params, message);
                        break;
                    case 'PRIVMSG':
                        const sender = parsedMessage.nick;
                        const target = params[0];
                        const content = params[1];

                        // Emite o evento geral.
                        this.emit('message', {
                            sender,
                            target,
                            content,
                            raw: message,
                        });

                        // Verifica se é PV ou Geral
                        if (target === this.nickname) {
                            this.emit('directMessage', {
                                sender,
                                content,
                                raw: message
                            });
                        }
                        else {
                            this.emit('channelMessage', {
                                sender,
                                channel: target,
                                content,
                                raw: message
                            });
                        }
                        break;
                    case 'NOTICE':
                        this.emit('notice', {
                            target: params[0],
                            content: params[1],
                            raw: message,
                        });
                        break;
                    case 'JOIN':
                        this.emit('join', {
                            user: parsedMessage.nick,
                            channel: params[0],
                            raw: message,
                        });
                        break;
                    case 'PART':
                        this.emit('part', {
                            user: parsedMessage.nick,
                            channel: params[0],
                            raw: message,
                        });
                        break;
                    case 'QUIT':
                        this.emit('quit', {
                            user: parsedMessage.nick,
                            host: parsedMessage.host || '',
                            reason: params[0] || '',
                            raw: message,
                        });
                        break;
                    case 'MODE':
                        this.emit('mode', {
                            user: parsedMessage.nick,
                            mode: params[1],
                            affected: params[2],
                            raw: message,
                        });
                        break;
                    case 'KICK':
                        this.emit('kick', {
                            kicker: parsedMessage.nick,
                            host: parsedMessage.host,
                            channelKick: params[0],
                            kickedUser: params[1],
                            reason: params[2],
                            raw: message,
                        });
                        break;
                    case 'err_nosuchnick':
                        this.emit('error', new Error('No such nickname exists: '+params[1]), parsedMessage);
                        this.emit('whoisError', {
                            error: "err_nosuchnick",
                            code: 401
                        });
                        break;
                    case 'err_usernotinchannel':
                        this.emit('error', new Error('User not in channel: '+params[1]), parsedMessage);
                        break;
                    case 'err_nicknameinuse':
                        this.emit('error', new Error('Username in use: '+params[1]), parsedMessage);
                        break;
                    case 'err_notregistered':
                        this.emit('error', new Error('You have not registered'), parsedMessage);
                        break;
                    case 'ERROR':
                        this.emit('error', new Error('Fatal Error'), parsedMessage);
                        break;                        
                    default:
                        this.emit('unknown', {
                            command,
                            raw: message
                        });
                }
            });
        });

        this.client.on('close', () => {
            this.emit('disconnected');
        });

        this.client.on('error', (err) => {
            this.emit('error', new Error(`Connection error: ${err.message}`));
        });
    }

    // Trata o Ping e envia automaticamente o PING
    handlePing(params, rawMessage) {
        const server = params[0] || this.parseMessage(rawMessage).trailing; // Fallback to trailing
        this.sendRawImmediate(`PONG ${server}`); // Respond to PING to maintain connection
        this.emit('ping', {
            server,
            raw: rawMessage
        });
        this.lastPingTime = Date.now();
    }

    // Verifica se o servidor envia ping, senão envia o pong para manter vivo.
    startPingChecker() {
        setInterval(() => {
            const now = Date.now();
            const timeSinceLastPing = now - this.lastPingTime;

            if (timeSinceLastPing > this.pingInterval) {
                console.warn('Servidor não enviou PING durante 8 minutos, enviar um PONG para manter vivo.');
                this.sendRaw('PONG :KeepAlive');
            }
        }, this.pingInterval / 2); // Check every minute
    }

    parseMessage(line, removeColors) {
        if (!line) return null; // Handle empty input
    
        if (removeColors) {
            line = novaColors.stripColorsAndStyle(line);
        }
    
        const message = {};
        let match;
    
        // Parse prefix
        match = line.match(/^:([^ ]+) +/);
        if (match) {
            message.prefix = match[1];
            line = line.substring(match[0].length); // More efficient than replace
    
            const prefixMatch = message.prefix.match(/^([_a-zA-Z0-9~[\]\\`^{}|-]*)(!([^@]+)@(.*))?$/);
            if (prefixMatch) {
                message.nick = prefixMatch[1];
                message.user = prefixMatch[3] || null;
                message.host = prefixMatch[4] || null;
            } else {
                message.server = message.prefix;
            }
        }
    
        // Parse command
        match = line.match(/^([^ ]+)\s*/);
        if (!match) return null; // Handle invalid format
    
        message.rawCommand = match[1];
        message.command = novaCodes[message.rawCommand]?.name || message.rawCommand;
        message.commandType = novaCodes[message.rawCommand]?.type || 'normal';
    
        line = line.substring(match[0].length); // Efficient removal
        message.params = [];
    
        // Parse parameters
        match = line.match(/(.*?)\s*:(.*)/);
        if (match) {
            const middle = match[1].trim();
            if (middle) message.params = middle.split(/\s+/);
            message.params.push(match[2]); // Trailing param
        } else if (line) {
            message.params = line.trim().split(/\s+/);
        }
    
        return message;
    }

    // Guarda as variaveis de identificação
    setCredentials(nickname, username, password = null) {

        if(nickname == "" || username == "")
        {
            this.emit('error', new Error('Nickname and username required.'));
            return false;
        }
        
        this.nickname = nickname;
        this.username = username;
        this.password = password;
    }

    // Junta-se a um canal
    joinChannel(channel) {
        setTimeout(() => {
            this.sendRaw(`JOIN ${channel}`);
        }, "2000");
    }

    // Manda uma mensagem a um canal ou user
    sendMessage(target, message, color = null) {

        // If predefined color is not null.
        if(this.messageColor != null) { color = this.messageColor; }

        const COLORS = {
            white: '0',
            black: '1',
            blue: '2',
            green: '3',
            red: '4',
            brown: '5',
            purple: '6',
            orange: '7',
            yellow: '8',
            light_green: '9',
            cyan: '10',
            light_cyan: '11',
            light_blue: '12',
            pink: '13',
            grey: '14',
            light_grey: '15',
        };
    
        let formattedMessage = message;
    
        if (color && COLORS[color.toLowerCase()]) {
            const colorCode = COLORS[color.toLowerCase()];
            const RESET = '\x03'; // Resets formatting
            formattedMessage = `\x03${colorCode}${message}${RESET}`;
        }
    
        this.sendRaw(`PRIVMSG ${target} :${formattedMessage}`);
    }

    // Manda uma mensagem crua ao servidor
    sendRaw(command) {
        this.commandQueue.push(command);
        this.processQueue();
    }

    // Faz bypass do floodProtection e envia um comando imediato
    sendRawImmediate(command) {
        if (this.client) {
            this.client.write(`${command}\r\n`);
        }
    }

    // Processa a lista de queue
    processQueue() {
        if (this.isProcessingQueue) return;

        this.isProcessingQueue = true;

        const interval = setInterval(() => {
            if (this.commandQueue.length === 0) {
                clearInterval(interval);
                this.isProcessingQueue = false;
                return;
            }

            const command = this.commandQueue.shift();
            if (this.client) {
                this.client.write(`${command}\r\n`);
            }
        }, this.floodProtectionDelay);
    }

    // Limpa o queue
    clearQueue() {
        this.commandQueue = [];
    }

    // Disconecta-se de um canal especifico
    part(channel, message = '') {
        const partMessage = message ? ` :${message}` : '';
        this.sendRaw(`PART ${channel}${partMessage}`);
    }

    // Obtem todos os nicks num canal
    names(channel) {
        this.sendRaw(`NAMES ${channel}`);
    }

    // Obtem todos os nicks num canal
    kick(channel, user, reason = '') {
        const formattedReason = reason ? ` :${reason}` : ''; // Add reason only if provided
        this.sendRaw(`KICK ${channel} ${user}${formattedReason}`);
    }

    // Adiciona um BAN na lista
    ban(channel, mask) {
        this.sendRaw(`MODE ${channel} +b ${mask}`);
    }

    // Desconecta-se do servidor.
    disconnect(message = 'Goodbye!') {
        this.sendRaw(`QUIT :${message}`);
        this.client.end();
    }

    // Obtem uma lista de bans do canal
    banlist(channel) {
        this.sendRaw(`MODE ${channel} +b`);
    }

    // Obtem a lista completa de Whois, concatena numa só resposta.
    whois(nickname) {
        return new Promise((resolve, reject) => {
            const whoisData = {
                nick: nickname,
                username: null,
                host: null,
                realName: null,
                server: null,
                serverInfo: null,
                idleTime: null,
                channels: [],
                isOperator: false,
            };
    
            const handleWhoisUser = (data) => {
                whoisData.username = data.username;
                whoisData.host = data.host;
                whoisData.realName = data.realName;
            };
    
            const handleWhoisServer = (data) => {
                whoisData.server = data.server;
                whoisData.serverInfo = data.serverInfo;
            };
    
            const handleWhoisChannels = (data) => {
                whoisData.channels = data.channels.split(' ');
            };
    
            const handleWhoisIdle = (data) => {
                whoisData.idleTime = parseInt(data.idleTime, 10);
            };
    
            const handleWhoisOperator = () => {
                whoisData.isOperator = true;
            };
    
            const handleWhoisEnd = () => {
                cleanup();
                resolve(whoisData);
            };
    
            const handleWhoisError = (data) => {
                if (data.code === 401 || data.error === "ERR_NOSUCHNICK") {
                    cleanup();
                    reject(new Error(`No such nickname: ${nickname}`));
                }
            };
    
            const cleanup = () => {
                this.off('whoisUser', handleWhoisUser);
                this.off('whoisServer', handleWhoisServer);
                this.off('whoisChannels', handleWhoisChannels);
                this.off('whoisIdle', handleWhoisIdle);
                this.off('whoisOperator', handleWhoisOperator);
                this.off('whoisEnd', handleWhoisEnd);
                this.off('whoisError', handleWhoisError);
            };
    
            // Listen for WHOIS response events
            this.on('whoisUser', handleWhoisUser);
            this.on('whoisServer', handleWhoisServer);
            this.on('whoisChannels', handleWhoisChannels);
            this.on('whoisIdle', handleWhoisIdle);
            this.on('whoisOperator', handleWhoisOperator);
            this.on('whoisEnd', handleWhoisEnd);
            this.on('whoisError', handleWhoisError); // Handle WHOIS errors
    
            // Send WHOIS command
            try {
                this.sendRaw(`WHOIS ${nickname}`);
            } catch (err) {
                cleanup();
                reject(err);
            }
        });
    }
}

module.exports = novaIRC;