const nova = require('./irc-nova');

// Create the instance
const bot = new nova();
const channel = "#novatesting";

// ##############################################
// Credentials and Authentication
// ##############################################

// Set bot credentials (nickname and username)
// @Nick
// @Realname
// @password (optional, null by default)
bot.setCredentials('NovaIRC', 'Nova IRC Bot');

// Connect to the chat
bot.connect({
    server: 'irc.libera.chat',
    port: 6697,
    ssl: true,
    messageColor: "white", // Choose an allowed color from the IRC table
    removeColors: true,
    rejectUnauthorized: false, // Optional, default is false
    rejoinLimit: 3,
    rejoinDelay: 5000, // ms
    maxLineLength: 350
});


// ##############################################
// Event Listeners
// ##############################################

// Triggered when the bot connects
bot.on('connected', () => {
    // Join the channel.
    bot.joinChannel(channel);
});

// Receive a RAW message
// @data
bot.on('raw', (data) => {
    // console.log(data);
});

// Receive a disconnect event
bot.on('disconnected', () => {
    console.log('Bot disconnected from the server.');
});

// Receive an error
// @err.message
// @raw - Returns raw parsed message
bot.on('error', (err, raw) => {
    console.error('Error:', raw);
});

// Receive a ping (automatically responds with a pong)
// @data.server
bot.on('ping', (data) => {
    console.log(`PING received from ${data.server}`);
});

// Triggered whenever a message is received.
// @data.sender 
// @data.target
// @data.content
// @data.raw
bot.on('message', (data) => {
    // console.log(`Message received in ${data.target}: ${data.content}`);
});

// Triggered when a private message is received
// @data.sender 
// @data.content
// @data.raw
bot.on('directMessage', (data) => {
    console.log(`Private message from ${data.sender}: ${data.content}`);

    if(data.content == "<message>")
    {
        // Send a message to the channel
        // @channel
        // @message
        let longMessage = "This is a very long message ".repeat(50); // Just an example of a long message
        bot.sendMessage(channel, longMessage, "blue");

        // Send a private message
        // @user
        // @message
        bot.sendMessage("nickname", 'Hello, nickname! How are you?.');
    }

    if(data.content == "<part>")
    {
        // Leave a specific channel
        // @channel
        // @Leaving Message
        bot.part(channel, 'Im done.');
    }

    if(data.content == "<join>")
    {
        // Join a channel
        // @channel
        bot.joinChannel(channel);
    }

    if(data.content == "<names>")
    {
        // Get users in the channel
        // @channel
        bot.names(channel);
    }

    if(data.content == "<kick>")
    {
        // Kick a user
        // @channel
        // @user
        // @reason
        bot.kick(channel, 'JohnDoe59', "Kicked by the bot");
    }

    if(data.content == "<ban>")
    {
        // Ban a user
        // @channel
        // @user
        // @reason
        bot.ban(channel, 'JohnDoe59@2001:818:df14:8c00:f08b:fad2:e1cd:63c5');
    }

    if(data.content == "<banlist>")
    {
        // Get the channel ban list
        // @channel
        bot.banlist(channel);
    }

    if(data.content == "<whois>")
    {
        // Get information about a user
        // @user
        bot.whois('Nickname').then((whoisData) => {
            console.log('WHOIS data:', whoisData);
        })
        .catch((err) => {
            console.error('WHOIS error:', err);
        });
    }

    if(data.content == "<getusers>")
    {
        console.log(bot.userManager.getUserInfo('Joaquim'));
    }

   
});

// Triggered whenever a message is received in a channel
// @data.sender
// @channel,
// @data.content
// @data.raw: 
bot.on('channelMessage', (data) => {
    console.log(`Channel message in ${data.channel} from ${data.sender}: ${data.content}`);
});

// Message of the Day (MOTD)
// @data.user,
// @data.content
// @data.raw: 
bot.on('motd', (data) => {
    console.log(`${data.content}`);
});

// User joined the channel, raw event with basic info.
// @data.user
// @data.channel
// @data.raw
bot.on('join', (data) => {
    console.log(`${data.user} joined ${data.channel}`);
});

// User joined the channel via userManager module that returns a complete whois info of that user.
// @data.username
// @data.host
// @data.realName
// @data.server
// @data.serverInfo
// @data.idleTime
// @data.channels
// @data.isOperator
// @data.isRegistered
bot.userManager.on('join', (data) => {
    console.log(`User Join:`);
    console.log(data);
});

// Receive complete Whois info
// @data.username
// @data.host
// @data.realName
// @data.server
// @data.serverInfo
// @data.idleTime
// @data.channels
// @data.isOperator
// @data.isRegistered
bot.on('whois', (data) => {
    // console.log(data);
});

// User left the channel
// @data.user
// @data.channel
// @data.reason
// @data.raw
bot.on('part', (data) => {
    console.log(`${data.user} left ${data.channel}: ${data.reason}`);
});

// Unknown command received
// @data.command
// @data.raw
bot.on('unknown', (data) => {
    console.log(`Unknown command ${data.command}: ${data.raw}`);
});

// List of users in a channel
// @data.channel
// @data.names
// @data.raw
bot.on('names', (data) => {
    console.log(`Users in ${data.channel}:`, data.names);
});

// Triggered when a notice is received
// @data.target
// @data.content
// @data.raw
bot.on('notice', (data) => {
    console.log(`${data.content}`);
});

// Triggered when bot is kicked
bot.on('botKicked', () => {
    console.log(`Bot was kicked.`);
});

// Triggered when a user quits
// @data.user
// @data.channel
// @data.reason
// @data.raw
bot.on('quit', (data) => {
    console.log(`User ${data.user} quit. (${data.reason})`);
});

// Mode was applied (triggered whenever a +mode is set)
// @data.user (channel or user, starting with # or not)
// @data.mode
// @affected
bot.on('+mode', (data) => {
    console.log(`[MODE] ${data.user} - Modes: ${data.mode}, Affected: ${data.affected}`);
});

// Mode was applied (triggered whenever a -mode is set)
// @data.user (channel or user, starting with # or not)
// @data.mode
// @affected
bot.on('-mode', (data) => {
    console.log(`[MODE] ${data.user} - Modes: ${data.mode}, Affected: ${data.affected}`);
});

// Triggered whenever
