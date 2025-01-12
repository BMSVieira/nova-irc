const EventEmitter = require('events');

class UserManager extends EventEmitter {
    constructor() {
        super();
        this.users = {}; // Store WHOIS data
    }

    init(ircClient) {
        this.ircClient = ircClient;

        // Listen for WHOIS responses and store them
        ircClient.on('userManager_whoIs', (data) => {
            
            this.users[data.nick] = {
                username: data.username,
                host: data.host,
                realName: data.realName,
                server: data.server,
                serverInfo: data.serverInfo,
                idleTime: data.idleTime,
                channels: data.channels,
                isOperator: data.isOperator,
                isRegistered: data.isRegistered,
                lastSeen: Date.now(),
            };

            console.log(`[UserManager] Stored WHOIS info for ${data.nick}`);

            // Emit an event when a user's WHOIS info is stored
            this.emit('join', data);
        });
    }

    // returns info from a specific user
    getUserInfo(nickname) {
        return this.users[nickname] || null;
    }

    // returns info of all users
    getAllUsers() {
        return this.users || null;
    }

}

module.exports = UserManager;
