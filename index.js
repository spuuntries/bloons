require("dotenv").config();

const procenv = process.env,
  Discord = require("discord.js"),
  client = new Discord.Client({
    intents: ["GUILDS", "GUILD_MEMBERS", "GUILD_MESSAGES"],
  }),
  db = (() => {
    const Enmap = require("enmap");
    return new Enmap({ name: "db" });
  })(),
  utils = require("./utils/utils.js");

function logger(msg) {
  console.log(`[${new Date()}] ${msg}`);
}

function login() {
  client.login(procenv.TOKEN).catch(() => {
    logger("Login failed, retrying in 5 seconds...");
    setTimeout(login, 5000);
  });
}

login();

client.on("ready", async () => {
  logger("Logged in as " + client.user.tag);

  // Get configured play channel
  /** @type {Discord.TextChannel} */
  const playChannel = await client.channels.fetch(procenv.PLAY_CHANNEL);
  if (!playChannel) {
    logger("Play channel not found!");
    process.exit(1);
  }

  // Check if the gameplay board
  // embed is already sent in the channel
  let gameBoard = (await playChannel.messages.fetch({ limit: 100 }))
      .filter((m) => m.author.id === client.user.id)
      .find((m) => m.embeds.length > 0),
    gameBoardEmbed = new Discord.MessageEmbed()
      .setColor("#0099ff")
      .setTitle("Board")
      .setDescription(utils.getGameBoard())
      .addField("🎈", "Unpopped", true)
      .addField("💥", "Popped", true)
      .addField(
        "How to play",
        "Below this message there's a controller, select a balloon to pop it!"
      )
      .setFooter({
        text: `This board is updated every 5 seconds.
The next board will be sent in <t:${
          //Get UNIX timestamp 5 seconds from now
          Math.floor((Date.now() + 5000) / 1000)
        }:R>`,
        icon_url: client.user.avatarURL(),
      })
      .setTimestamp(),
    interactionMessageEmbed = new Discord.MessageEmbed()
      .setColor("#0099ff")
      .setTitle("Interaction")
      .setDescription("This is where you can interact with the game.")
      .setFooter({
        text: `This board is updated every 5 seconds.
The next board will be sent in <t:${
          //Get UNIX timestamp 5 seconds from now
          Math.floor((Date.now() + 5000) / 1000)
        }:R>`,
        icon_url: client.user.avatarURL(),
      })
      .setTimestamp();

  if (!gameBoard) {
    logger("Gameboard not found, creating...");
    gameBoardEmbed
      .setDescription(utils.getGameBoard())
      .setFooter({
        text: `This board is updated every 5 seconds.
The next board will be sent in <t:${
          //Get UNIX timestamp 5 seconds from now
          Math.floor((Date.now() + 5000) / 1000)
        }:R>`,
        icon_url: client.user.avatarURL(),
      })
      .setTimestamp();
    gameBoard = await playChannel.send({
      embeds: [gameBoardEmbed],
    });
  }

  const balloonRowSelection = new Discord.MessageActionRow().addComponent(
    new Discord.MessageSelectionComponent()
      .setCustomId("which-row")
      .setTitle("Which row is the balloon in?")
      .setOptions(
        (() => {
          let a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
          // Return a as an array of strings corresponding to number of rows in the game board
          return a
            .split("")
            .slice(0, utils.getGameBoard().split("\n").length - 1);
        })()
      )
  );

  const balloonColumnSelection = new Discord.MessageActionRow().addComponent(
    new Discord.MessageSelectionComponent()
      .setCustomId("which-column")
      .setTitle("Which column is the balloon in?")
      .setOptions(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"])
  );

  const toolSelectionRow = new Discord.MessageActionRow().addComponent(
    new Discord.MessageSelectionComponent()
      .setCustomId("which-tool")
      .setPlaceholder("Which action?")
      .addOptions(getToolOptions())
  );

  let interactionMessage = await playChannel.messages
    .fetch({ limit: 100 })
    .then((m) =>
      m
        .filter((m) => m.author.id === client.user.id)
        .find((m) => m.embeds.length > 0)
    );

  // Get the game board embed
  // and update it every 5 seconds
  setInterval(async () => {
    gameBoard = (await playChannel.messages.fetch({ limit: 100 }))
      .filter((m) => m.author.id === client.user.id)
      .find((m) => m.embeds.length > 0);

    if (gameBoard) {
      gameBoardEmbed
        .setDescription(utils.getGameBoard())
        .setFooter({
          text: `This board is updated every 5 seconds.
The next board will be sent in <t:${
            //Get UNIX timestamp 5 seconds from now
            Math.floor((Date.now() + 5000) / 1000)
          }:R>`,
          icon_url: client.user.avatarURL(),
        })
        .setTimestamp();
      await gameBoard.edit({
        embeds: [gameBoardEmbed],
      });
    } else {
      logger("Gameboard not found, creating...");
      gameBoardEmbed
        .setDescription(utils.getGameBoard())
        .setFooter({
          text: `This board is updated every 5 seconds.
The next board will be sent in <t:${
            //Get UNIX timestamp 5 seconds from now
            Math.floor((Date.now() + 5000) / 1000)
          }:R>`,
          icon_url: client.user.avatarURL(),
        })
        .setTimestamp();
      playChannel.send({
        embeds: [gameBoardEmbed],
      });
    }

    // Get interaction message
    // and update it every 5 seconds
    interactionMessage = await playChannel.messages
      .fetch({ limit: 100 })
      .then((m) =>
        m
          .filter((m) => m.author.id === client.user.id)
          .find((m) => m.embeds.length > 0)
      );

    if (!interactionMessage) {
      logger("Interaction message not found, creating...");
      interactionMessageEmbed
        .setFooter({
          text: `This board is updated every 5 seconds.
The next board will be sent in <t:${
            //Get UNIX timestamp 5 seconds from now
            Math.floor((Date.now() + 5000) / 1000)
          }:R>`,
          icon_url: client.user.avatarURL(),
        })

        .setTimestamp();

      await playChannel.send({
        embeds: [interactionMessageEmbed],
        components: [
          balloonRowSelection,
          balloonColumnSelection,
          toolSelectionRow,
        ],
      });
    } else {
      interactionMessageEmbed.setFooter({
        text: `This board is updated every 5 seconds.
The next board will be sent in <t:${
          //Get UNIX timestamp 5 seconds from now
          Math.floor((Date.now() + 5000) / 1000)
        }:R>`,
        icon_url: client.user.avatarURL(),
      });

      await interactionMessageEmbed.edit({
        embeds: [interactionMessageEmbed],
        components: [
          balloonRowSelection,
          balloonColumnSelection,
          toolSelectionRow,
        ],
      });
    }
  }, 5000);
});
