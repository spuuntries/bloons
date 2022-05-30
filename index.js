require("dotenv").config();

const procenv = process.env,
  Discord = require("discord.js"),
  client = new Discord.Client({
    intents: ["GUILDS", "GUILD_MEMBERS", "GUILD_MESSAGES"],
  }),
  db = (() => {
    const Enmap = require("enmap");
    return new Enmap({ name: "db" });
  })();

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
    .find((m) => m.embeds.length > 0);
  if (!gameBoard) {
    logger("Gameboard not found, creating...");
    const gameBoardEmbed = new Discord.MessageEmbed()
      .setColor("#0099ff")
      .setTitle("Board")
      .setDescription(
        "This is where you can view the current state of the game."
      )
      .setFooter({
        text: "This board will be updated every 5 seconds.",
        icon_url: client.user.avatarURL(),
      });
    gameBoard = await playChannel.send(gameBoardEmbed);
  }

  // Get the game board embed
  // and update it every 5 seconds
  setInterval(async () => {
    const gameBoardEmbed = await gameBoard.fetch();
    gameBoardEmbed.setDescription(getGameBoard());
    gameBoardEmbed.setFooter({
      text: "This board will be updated every 5 seconds.",
      icon_url: client.user.avatarURL(),
    });
    await gameBoardEmbed.edit(gameBoardEmbed);
  }, 5000);

  // Get interaction message
  // and update it every 5 seconds
  const interactionMessage = await playChannel.messages
    .fetch({ limit: 100 })
    .then((m) =>
      m
        .filter((m) => m.author.id === client.user.id)
        .find((m) => m.embeds.length > 0)
    );
  if (!interactionMessage) {
    logger("Interaction message not found, creating...");
    const interactionMessageEmbed = new Discord.MessageEmbed()
      .setColor("#0099ff")
      .setTitle("Interaction")
      .setDescription("This is where you can interact with the game.")
      .setFooter({
        text: "This message will be updated every 5 seconds.",
        icon_url: client.user.avatarURL(),
      });

    const balloonSelectionRow = new Discord.MessageActionRow().addComponent(
      new Discord.MessageSelectionComponent()
        .setCustomId("which-balloon")
        .setPlaceholder("Which balloon?")
        .addOptions(getBalloonOptions())
    );

    const toolSelectionRow = new Discord.MessageActionRow().addComponent(
      new Discord.MessageSelectionComponent()
        .setCustomId("which-tool")
        .setPlaceholder("Which action?")
        .addOptions(getToolOptions())
    );

    await playChannel.send({
      embeds: [interactionMessageEmbed],
      components: [balloonSelectionRow, toolSelectionRow],
    });
  }

  setInterval(async () => {
    try {
      await interactionMessage.delete();
    } catch (e) {
      logger(e);
    }
    const interactionMessageEmbed = new Discord.MessageEmbed()
      .setColor("#0099ff")
      .setTitle("Interaction")
      .setDescription("This is where you can interact with the game.")
      .setFooter({
        text: "This message will be updated every 5 seconds.",
        icon_url: client.user.avatarURL(),
      });

    const balloonSelectionRow = new Discord.MessageActionRow().addComponent(
      new Discord.MessageSelectionComponent()
        .setCustomId("which-balloon")
        .setPlaceholder("Which balloon?")
        .addOptions(getBalloonOptions())
    );

    const toolSelectionRow = new Discord.MessageActionRow().addComponents([
      new Discord.MessageSelectMenu()
        .setCustomId("which-tool")
        .setPlaceholder("Which action?")
        .addOptions(getToolOptions()),
    ]);

    await playChannel.send({
      embeds: [interactionMessageEmbed],
      components: [balloonSelectionRow, toolSelectionRow],
    });
  }, 5000);
});
