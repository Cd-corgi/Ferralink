<p align="center">
  <img src="https://media.discordapp.net/attachments/936271538196451379/1035586844617883708/feralink_tape.png?width=705&height=134">
</p>

[![Discord](https://img.shields.io/discord/1035595149385945088?color=fa860a&logo=discord&logoColor=white)](https://discord.gg/7M6yGBTn79)
[![npm version](https://img.shields.io/npm/v/ferra-link?style=flat-square)](https://www.npmjs.com/package/ferra-link)
[![npm download](https://img.shields.io/npm/dt/ferra-link.svg?maxAge=3600)](https://www.npmjs.com/package/ferra-link)
![GitHub issues](https://img.shields.io/github/issues-raw/Cd-corgi/Ferralink?style=flat-square)

  
# 🎶 FerraLink

A Simple but powerful Lavalink Client for your JavaScript Discord Bot!

# 🔨 Requirements 

* Node.js >= 16.9.0 or Latest.
* Discord.js >= 14.6.0.

# 📖 Documentation
- [FerraLink Docs](https://ferralink.gitbook.io/docs/).
- [Shoukaku Docs](https://deivu.github.io/Shoukaku).

# 📂 Implementation
- A [example bot](https://github.com/vkamsingh/Ferralink-Example) as guide for beginners.
- If you have any issues, please join our [support server](https://discord.gg/8n3yNqtPAE).

# 📦 How to Install FerraLink

> 1. Go to console and write this `npm i ferra-link`
> 
> 2. Having a Host with Lavalink Client (Recommended) or using it in Localhost 
>
> 3. Do not forget Giving the `Intents` for `Voice Channels`

# How to Setup our FerraLink

## Set the Initilizer of Ferralink

*Creating in a way like the code example you can import the bot, nodes and shoukakuOptions.*

```js
const { Client, GatewayIntentBits } = require("discord.js");
const { FerraLink } = require("ferra-link");
const { Connectors } = require("shoukaku");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ],
});


client.FerraLink = new FerraLink({
    nodes: [{
      name: "Lavalink",
      url: "localhost:2333",
      auth: "youshallpass",
      secure: false
    }],
    shoukakuoptions: {
        moveOnDisconnect: false,
        resumable: false,
        resumableTimeout: 60,
        reconnectTries: 10,
        restTimeout: 60000
    },
    spotify: [{
        ClientID: "Your spotify clientId here",
        ClientSecret: "Your spotify clientSecret here"
    }],
    defaultSearchEngine: "ytsearch" //Avaible engines: 'ytsearch', 'ytmsearch', 'spsearch', 'scsearch',
}, new Connectors.DiscordJS(client));
```

## A small example to create play command.
```js
const player = await client.FerraLink.createPlayer({
    guildId: message.guild.id,
    voiceId: message.member.voice.channel.id,
    textId: message.channel.id,
    shardId: message.guild.shardId,
    volume: 100,
    deaf: true,
});

const resolve = await player.search(args.join(" "));
const { loadType, tracks, playlistInfo } = resolve;

if (loadType === "NO_MATCHES" || !tracks.length) return;

if (loadType === "PLAYLIST_LOADED") {
    for (const track of tracks) player.queue.add(track, { requester: message.author });
    
    if (!player.playing && !player.paused) await player.play();
    message.channel.send({ content: `Added ${player.queue.length} tracks from ${playlistInfo.name}` });
} else if (loadType === "SEARCH_RESULT" || loadType === "TRACK_LOADED") {
    player.queue.add(tracks[0], { requester: message.author });
    if (!player.playing && !player.paused) await player.play();
    message.channel.send({ content: `Queued ${tracks[0].info.title}` });
} else return;
```

# Getting the Events (shoukaku)

> *You can access event with the help of `client.FerraLink.shoukaku.on()....`.*

<center>

| **Event Name** 	|   **Elements**  	  |       **Description**         |
|:--------------:	|:------------------: |:----------------------------: |
|   ready 	      | name, resumed       | Event of the node connection. |
|   error         | name, error 	      | Event of the node error.      |
|   close         | name, code, reason  | Event of the node close.	    |
|   disconnect    | name, players, move | Event of the node disconnect.	|
|   debug         | name, reason	      | Event of the node debug.      |
</center>

# Getting the Events (FerraLink)

> *You can access event with the help of `client.FerraLink.on()....`.*

<center>

| **Event Name** 	  |   **Elements**  |       **Description**         |
|:----------------: |:--------------: |:----------------------------: |
|   trackStart	    | player, track   | Event of the track start.     |
|   trackEnd        | player, track	  | Event of the track end.       |
|   queueEnd        | player          | Event of the queue end.	      |
|   playerClosed    | player, data    | Event of the player close.	  |
|   trackException  | player, data	  | Event of the track exception. |
|   playerUpdate    | player, data	  | Event of the player update.   |
|   trackStuck      | player, data	  | Event of the track stuck.     |
|   trackError      | player, error   | Event of the track error.     |
|   playerResumed   | player          | Event of the player resumed.  |
|   playerDestroy   | player	        | Event of the player destroyed.|
|   playerCreate    | player	        | Event of the player create.   |
</center>

## Contributors
> Deivu as the owner of [Shoukaku](https://github.com/Deivu/Shoukaku).
>
> Vkamsingh, Corgi as the owner of [FerraLink](https://github.com/Cd-corgi/Ferralink).
>
> Prahar as the maintainer of [FerraLink Docs](https://ferralink.gitbook.io/untitled).
>
> Inspired by [kazagumo](https://www.npmjs.com/package/kazagumo), [Poru](https://www.npmjs.com/package/poru) and [erela.js](https://www.npmjs.com/package/erela.js).
