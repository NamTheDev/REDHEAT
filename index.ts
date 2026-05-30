import { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import config from "./config.json";
import db from "./db";

const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error("Missing DISCORD_TOKEN");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  allowedMentions: { repliedUser: false },
});

client.on("ready", () => console.log(`Bot active: ${client.user?.tag}`));

client.on("messageCreate", (msg) => {
  if (msg.author.bot || !msg.content.startsWith(config.prefix)) return;
  const args = msg.content.slice(config.prefix.length).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();
  const uid = msg.author.id;
  const p = config.prefix;

  db.run("INSERT OR IGNORE INTO users (id) VALUES (?)", [uid]);

  const reply = (content: any) => msg.reply({ ...content, allowedMentions: { repliedUser: false } });

  const commands = [
    { name: "shop", desc: "View available items" },
    { name: "buy <item>", desc: "Buy item with Shellite" },
    { name: "build", desc: "Start building a castle" },
    { name: "splash @user", desc: "Damage a castle" },
    { name: "sell", desc: "Sell castle for Bloodern" },
    { name: "give @user <amount>", desc: "Admin: Give Shellite" }
  ];

  switch (cmd) {
    case "help":
      const embed = new EmbedBuilder()
        .setTitle("Summer Event Bot")
        .setDescription("Available commands:")
        .addFields(commands.map(c => ({ name: `\`${p} ${c.name}\``, value: c.desc })));
      reply({ embeds: [embed] });
      break;

    case "shop":
      const shopEmbed = new EmbedBuilder()
        .setTitle("Shellite Shop 🐚")
        .setDescription("Buy items to upgrade or damage castles.")
        .addFields(
          { name: "🪣 Bucket (3)", value: "Build castle" },
          { name: "💧 Water (2)", value: "Shape castle" },
          { name: "🌊 Splash (2)", value: "Damage castle" },
          { name: "⚙️ Rebuild (1)", value: "Fix damage" },
          { name: "🏖️ Role (3)", value: "Summer Role" }
        );
      reply({ embeds: [shopEmbed] });
      break;

    case "buy":
      const item = args[0] as keyof typeof costs;
      const costs = { bucket: 3, water: 2, splash: 2, rebuild: 1, role: 3 };
      const cost = costs[item];
      if (!cost) return reply({ content: "Unknown item." });

      const user = db.query("SELECT shellite FROM users WHERE id = ?").get(uid) as { shellite: number };
      if (user.shellite < cost) return reply({ content: "Not enough Shellite." });

      db.run("UPDATE users SET shellite = shellite - ? WHERE id = ?", [cost, uid]);
      reply({ content: `Successfully bought **${item}**!` });
      break;

    case "splash":
      const target = msg.mentions.users.first();
      if (!target) return reply({ content: "Mention user to splash." });
      db.run("UPDATE castles SET health = health - 2 WHERE user_id = ?", [target.id]);
      reply({ content: `💥 Splashed **${target.username}**!` });
      break;

    case "sell":
      const castle = db.query("SELECT stage FROM castles WHERE user_id = ?").get(uid) as any;
      if (!castle) return reply({ content: "No castle to sell." });
      const price = castle.stage * 100;
      db.run("UPDATE users SET bloodern = bloodern + ? WHERE id = ?", [price, uid]);
      db.run("DELETE FROM castles WHERE user_id = ?", [uid]);
      reply({ content: `💰 Sold castle for **${price}** Bloodern.` });
      break;

    case "give":
      if (!msg.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return reply({ content: "Unauthorized." });
      }
      const giveTarget = msg.mentions.users.first();
      const amount = parseInt(args[1] ?? "0");
      if (!giveTarget || isNaN(amount) || amount <= 0) return reply({ content: "Usage: give @user <amount>" });
      db.run("INSERT OR IGNORE INTO users (id) VALUES (?)", [giveTarget.id]);
      db.run("UPDATE users SET shellite = shellite + ? WHERE id = ?", [amount, giveTarget.id]);
      reply({ content: `Gave ${amount} Shellite to **${giveTarget.username}**.` });
      break;
  }
});

client.login(token);
