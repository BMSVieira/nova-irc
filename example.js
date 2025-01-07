const nova = require('./irc-nova');

// Criar a instância
const bot = new nova();

// ##############################################
// Credênciais e autenticação
// ##############################################

// Set bot credentials (nickname and username)
// @Nick
// @Realname
// @password (opcional, null por defeito)
bot.setCredentials('NovaIRC', 'Nova Portugal');

// Conetar-se ao chat
// @url
// @porta
// @ssl (boolean)
bot.connect({
    server: 'irc.libera.chat',
    port: 6697,
    ssl: true,
    messageColor: "green", // Escolher a cor permitida dentro da tabela IRC
    removeColors: true,
    rejectUnauthorized: false, // Opcional, default é false
});

// Recebe um evento quando se conecta
bot.on('connected', () => {

    console.log(' ** BOT Connectou-se **');

    // Junta-se ao canal.
    bot.joinChannel('#testingpg');
});

// ##############################################
// Eventos Listener
// ##############################################

// Receber uma mensagem RAW
// @message
bot.on('raw', (message) => {
    // console.log('Raw message:', message);
});

// Receber um disconect
bot.on('disconnected', () => {
    console.log('Bot disconnected from the server.');
});

// Receber um erro
// @err.message
// @raw - Returns raw parsed message
bot.on('error', (err, raw) => {
    console.error('Error:', raw);
});

// Receber um ping // emite um pong automatico
// @data.server
bot.on('ping', (data) => {
    console.log(`PING received from ${data.server}`);
});

// Emitido sempre que recebe uma mensagem.
// @data.sender 
// @data.target
// @data.content
// @data.raw
bot.on('message', (data) => {
    // console.log(`Message received in ${data.target}: ${data.content}`);
});

// Emitido sempre que recebe uma mensagem privada
// @data.sender 
// @data.content
// @data.raw
bot.on('directMessage', (data) => {
    console.log(`Mensagem Privada de ${data.sender}: ${data.content}`);

    if(data.content == "<message>")
    {
        // Mandar mensagem no canal
        // @channel
        // @message
        bot.sendMessage('#testingpg', 'Hello, IRC! MyBotNickname has joined.', 'red');

        // Mandar mensagem privada
        // @user
        // @message
        bot.sendMessage("heysus", 'Hello, IRC! MyBotNickname has joined.');
    }

    if(data.content == "<part>")
    {
        // Sair de um canal em especifico
        // @channel
        // @Leaving Message
        bot.part("#testingpg", 'Im done.');
    }

    if(data.content == "<join>")
    {
        // Juntar-se a um canal
        // @channel
        bot.joinChannel('#testingpg');
    }

    if(data.content == "<names>")
    {
        // Obter users no canal
        // @channel
        bot.names('#testingpg');
    }

    if(data.content == "<kick>")
    {
        // Kicka o utilizador
        // @channel
        // @user
        // @reason
        bot.kick('#testingpg', 'JohnDoe59', "Kickado pelo bot");
    }

    if(data.content == "<ban>")
    {
        // Kicka o utilizador
        // @channel
        // @user
        // @reason
        bot.ban('#testingpg', 'JohnDoe59@2001:818:df14:8c00:f08b:fad2:e1cd:63c5');
    }

    if(data.content == "<banlist>")
    {
        // Obtem a lista de bans do canal
        // @channel
        bot.banlist('#testingpg');

    }

    if(data.content == "<whois>")
    {
        // Obtem a lista de bans do canal
        // @channel
        bot.whois('PannaCotta').then((whoisData) => {
            console.log('WHOIS data:', whoisData);
        })
        .catch((err) => {
            console.error('WHOIS error:', err);
        });


    }
   
});

// Emitido sempre que o canal recebe uma mensagem
// @data.sender
// @channel,
// @data.content
// @data.raw: 
bot.on('channelMessage', (data) => {
    console.log(`Mensagem no Canal: ${data.channel} de ${data.sender}: ${data.content}`);
});

// MOTD
// @data.user,
// @data.content
// @data.raw: 
bot.on('motd', (data) => {
    console.log(`${data.content}`);
});

// Entrou no canal
// @data.user
// @data.channel
// @data.raw
bot.on('join', (data) => {
    console.log(`${data.user} joined ${data.channel}`);
});

// Saiu do canal
// @data.user
// @data.channel
// @data.reason
// @data.raw
bot.on('part', (data) => {
    console.log(`${data.user} left ${data.channel}: ${data.reason}`);
});

// Comando desconhecido
// @data.command
// @data.raw
bot.on('unknown', (data) => {
    console.log(`Unknown command ${data.command}: ${data.raw}`);
});

// Names
// @data.channel
// @data.names
// @data.raw
bot.on('names', (data) => {
    console.log(`Users in ${data.channel}:`, data.names);
});

// Sempre que recebe uma noticia
// @data.target
// @data.content
// @data.raw
bot.on('notice', (data) => {
    console.log(`${data.content}`);
});

// Sempre que recebe uma noticia
// @data.user
// @data.channel
// @data.reason
// @data.raw
bot.on('quit', (data) => {
    console.log(`Utilizador ${data.user} saiu. (${data.reason})`);
});

// Modo foi aplicado (emitido sempre que um modo é aplicado)
// @data.user (canal ou user, comecando por # ou não.)
// @data.mode
// @affected
bot.on('mode', (data) => {
    console.log(`[MODE] ${data.user} - Modes: ${data.mode}, Affected: ${data.affected}`);
});

// Emitido sempre que um utilizador é kickado
// @data.kicker
// @data.host
// @data.channelKick
// @data.kickedUser
// @data.reason
// @data.raw: message
bot.on('kick', (data) => {
    console.log(`${data.kickedUser} was kicked from ${data.channelKick} by ${data.kicker}. Reason: ${data.reason}`);
});

// Obtem a lista de bans
// @data.channelban
// @data.banMask
// @data.setBy
// @data.timestamp
bot.on('banlist', (data) => {
    console.log(data);
});







