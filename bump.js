const { Events } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./economy.db');

const REWARD = 200;
const COOLDOWN = 4 * 60 * 60 * 1000; // 4 часа

// Для хранения последних пользователей, вызвавших слэш-команду
const recentSlashUsers = new Map(); // userId => timestamp

module.exports = {
    name: Events.MessageCreate,
    type: 'event',
    once: false,

    async run(client, message) {
        const now = Date.now();

        // === ПЕРВОЕ РЕАГИРОВАНИЕ: слэш-команда bump / up / like ===
        if (message.interaction) {
            const commandName = message.interaction.commandName;
            const allowedCommands = ['bump', 'up', 'like'];
            if (!allowedCommands.includes(commandName)) return;

            const userId = message.interaction.user.id;
            recentSlashUsers.set(userId, now); // сохраняем вызов

            db.get(`SELECT balance, last_slash_reward FROM users WHERE user_id = ?`, [userId], (err, row) => {
                if (err) return;

                if (!row) {
                    db.run(
                        `INSERT INTO users (
                            user_id, balance, inventory, last_collect, last_rob,
                            last_random, ecomes_active, last_ecomes, last_slash_reward
                        ) VALUES (?, ?, '[]', 0, 0, 0, 0, 0, ?)`,
                        [userId, REWARD, now],
                        () => {
                            message.channel.send(`💸 <@${userId}> получил **${REWARD} монет** за \`/${commandName}\`!`).catch(() => {});
                        }
                    );
                } else {
                    const last = row.last_slash_reward || 0;
                    if (now - last < COOLDOWN) return;

                    db.run(
                        `UPDATE users SET balance = balance + ?, last_slash_reward = ? WHERE user_id = ?`,
                        [REWARD, now, userId],
                        () => {
                            message.channel.send(`💸 <@${userId}> получил **${REWARD} монет** за \`/${commandName}\`!`).catch(() => {});
                        }
                    );
                }
            });

            return; // обязательно return, чтобы не перейти к 3 реагированию
        }

        // === ТРЕТЬЕ РЕАГИРОВАНИЕ: сообщение от бота ПОСЛЕ /bump, без interaction ===
        if (!message.author.bot) return;

        const recentUser = [...recentSlashUsers.entries()].find(
            ([, timestamp]) => now - timestamp < 10_000 // 10 секундное окно
        );

        if (!recentUser) return;

        const userId = recentUser[0];

        db.get(`SELECT balance, last_slash_reward FROM users WHERE user_id = ?`, [userId], (err, row) => {
            if (err) return;

            if (!row) {
                db.run(
                    `INSERT INTO users (
                        user_id, balance, inventory, last_collect, last_rob,
                        last_random, ecomes_active, last_ecomes, last_slash_reward
                    ) VALUES (?, ?, '[]', 0, 0, 0, 0, 0, ?)`,
                    [userId, REWARD, now],
                    () => {
                        message.channel.send(`💸 <@${userId}> получил **${REWARD} монет** за bump!`).catch(() => {});
                        recentSlashUsers.delete(userId);
                    }
                );
            } else {
                const last = row.last_slash_reward || 0;
                if (now - last < COOLDOWN) return;

                db.run(
                    `UPDATE users SET balance = balance + ?, last_slash_reward = ? WHERE user_id = ?`,
                    [REWARD, now, userId],
                    () => {
                        message.channel.send(`💸 <@${userId}> получил **${REWARD} монет** за bump!`).catch(() => {});
                        recentSlashUsers.delete(userId);
                    }
                );
            }
        });
    }
};
