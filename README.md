# Comfmunity Public
The public version of Comfmunity, a discord inter-server network owned by the [Noelle Mains Armoured-Goddess Discord Server](https://discord.gg/noelle).

This repository includes all core functionalities, allowing you to self-host and run your own inter-server network.

## Requirements
[Node.js](https://nodejs.org/en) (v18+ recommended)

[MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) or a local MongoDB instance


## Installation
Clone and install packages:

```bash
git clone https://github.com/Crytek1012/comfmunity-public.git
cd comfmunity-public
npm install
```
## Configuration

Create a `.env` file in the root directory:
```javascript
CLIENT_TOKEN=your_discord_bot_token
MONGO_URI=your_mongodb_connection_uri
MONGO_DB=your_database_name
```


Edit `config.ts`:

```javascript
const config = {
    prefix: '!', // the prefix used to trigger a command
    ownerId: '', // the ID of the owner of this application
    mainConnectionId: '', // the ID of the central connection
    messageLogsChannelId: '', // the channel where to log messages
    modLogsChannelId: '', // the channel where to log mod actions
    alertChannelId: '', // the channel where to log alerts
    loadWebhooksOnStartup: true, // whether to cache webhooks on startup
    logToFile: true, // whether to log files
    logPath: './app.log' // the path to the log file
} as const;
```

### Running the Bot
Once you're done configuring everything, simply run:

```bash
npm run start
```

# Connecting to a server

Run this command in the channel you want the connection to be:
```bash
!connect
```
The connection is disabled by default, enable it with:
```bash
!enable
```

# Deleting messages
Messages can be deleted by removing the original or replying to it with the command:
```bash
!delete
```

# Allowing users to connect to the network
Only users with the authority level of `admin` can create new connections.

You can assign an authority with the command:
```bash
!promote [user_id] [authority_level]
```
Example:
```bash
!promote 393710933354217473 admin
```
There are two levels of authority that can be assigned:

1. Moderator - Can delete messages, ban and unban users
2. Admin - Can additionally create new connections

> [!NOTE]
> Only the owner of the application and the admin that created the connection can manage said connection.

# Other commands
Use the `!help` command to browse available commands. Note that only the commands you have permission to execute will be displayed.

# Support
If you need help, want to make a suggestion, or report an issue, you can contact us in the [Noelle Mains Armoured-Goddess Discord Server](https://discord.gg/noelle).