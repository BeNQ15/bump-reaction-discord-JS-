require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');

class Bot extends Client {
    constructor() {
        super({
            allowedMentions: {
                parse: ["roles", "users", "everyone"],
                repliedUser: false,
            },
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.DirectMessages,
            ],
            partials: ['GUILD_MEMBER', 'USER'],
        });

        this.token = process.env.TOKEN;
        this.cmd = new Collection();
        this.commands = new Collection();
        this.cache = new Collection();
        this.cooldowns = new Collection();
        this.cooldownsLimit = new Collection();
        this.prefixs = ["e.", "E."];
        this.prefix = "!";
        this.owners = ["первый-владелец-бота", "второй-владелец-бота"];
    }

    async handlers(dir) {
        const files = await fs.promises.readdir(dir);
        if (dir.endsWith('X')) return;

        for (const file of files) {
            const filePath = `${dir}/${file}`;
            const stats = await fs.promises.stat(filePath);

            if (stats.isDirectory() && dir !== "./cmd") {
                await this.handlers(filePath);
            } else if (stats.isFile() && !file.endsWith('X.js') && file.endsWith('.js')) {
                const module = require(filePath);
                if (dir === "./cmd") {
                    this.cmd.set(module.name, module);
                    console.log(`Загружено: ${filePath}`);
                    continue;
                }

                if (module.disabled) continue;

                if (module.type === "event") {
                    const handler = (...args) => module.run(this, ...args);
                    module.once ? this.once(module.name, handler) : this.on(module.name, handler);
                    console.log(`Загружено: ${filePath}`);
                } else if (module.type === "command") {
                    this.cooldowns.set(module.name, new Collection());
                    this.cooldownsLimit.set(module.name, new Collection());
                    this.commands.set(module.name, module);
                    console.log(`Загружено: ${filePath}`);
                } else {
                    console.warn(`Не определенно: ${filePath}`);
                }
            }
        }
    }

    maX(str, maxLength) {
        return str.length > maxLength ? str.slice(0, maxLength - 3) + '...' : str;
    }
}

const bot = new Bot();

(async () => {
    try {
        await bot.handlers('./cmd');
        await bot.handlers('./events');
    } catch (error) {
        console.error(`Ошибка инициализации бота: ${error.message}\n${error}`);
    }

    bot.login().catch(error => {
        console.error(`Ошибка входа в Discord: ${error.message}`);
        process.exit(1);
    });
})();

process.on('SIGINT', () => bot.destroy());
process.on('SIGTERM', () => bot.destroy());
