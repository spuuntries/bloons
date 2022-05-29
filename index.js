require("dotenv").config();

const procenv = process.env,
          Discord = require("discord.js"),
	  client = new Discord.Client({ intents: ["GUILDS", "GUILD_MEMBERS", "GUILD_MESSAGES"] }),
	  db = (() => {
		  const Enmap = require("enmap");
		  return new Enmap({ name: "db"});
		  	  })();


function login() {
	client.login(procenv.TOKEN).catch(() => {
		console.log("Login failed, retrying in 5 seconds...");
		setTimeout(login, 5000);
	});
