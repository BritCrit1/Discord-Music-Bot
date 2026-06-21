import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const commandScope = (process.env.COMMAND_SCOPE || 'guild').toLowerCase();

if (!token || !clientId) {
  console.error('Missing env values: DISCORD_TOKEN, CLIENT_ID');
  process.exit(1);
}

if (commandScope !== 'global' && !guildId) {
  console.error('Missing GUILD_ID for guild command deployment. Set COMMAND_SCOPE=global to deploy global commands.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const filePath = path.join(commandsPath, file);
  const { default: command } = await import(pathToFileURL(filePath).href);
  if ('data' in command) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(token);

if (commandScope === 'global') {
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log('Successfully registered global application commands.');
} else {
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
  console.log(`Successfully registered guild application commands for ${guildId}.`);
}
