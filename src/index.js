const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const {
	fetchPrivateParkingAvailability,
	fetchPublicParkingAvailability,
	fetchAccountPromoCodes,
	createCart,
	claimCart,
	redeemPromoCode
} = require('./honk.helper');
const { sendReservationEmbed, sendNoReservationNeededEmbed } = require('./discord.helper');

// Your bot token here
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const POLL_INTERVAL = 60_000; // 60_000 ms = 1 minute

let honkPromoCode = null;

// The file where we store watchers
const WATCHERS_FILE = path.join(__dirname, 'data', 'watchers.json');

// If watchers.json doesn’t exist, create an empty one
if(!fs.existsSync(WATCHERS_FILE)) {
	fs.writeFileSync(WATCHERS_FILE, JSON.stringify([]));
}

// Load watchers from file on startup
const watchers = JSON.parse(fs.readFileSync(WATCHERS_FILE, 'utf8'));

/**
 * Helper to save watchers any time we modify them
 */
function saveWatchers() {
	fs.writeFileSync(WATCHERS_FILE, JSON.stringify(watchers, null, 2));
}

// ------------------------
// DISCORD CLIENT
// ------------------------
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	]
});

/**
 * Handles the watch command
 * @param {Message} message - The message object
 * @returns {Promise<null>} A promise that resolves to null
 */
async function watchCommand(message) {
	const args = message.content.trim().split(/\s+/);
	if(args.length < 2) {
		return message.reply('Please provide a date, e.g. `!watch 2025-03-14`');
	}

	const dateArg = args[1]; // "YYYY-MM-DD"

	// (Optional) Validate the date format quickly:
	// You might do more robust checks for the date being in the next 30 days.
	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	if(!dateRegex.test(dateArg)) {
		return message.reply('Invalid date format. Use `YYYY-MM-DD`.');
	}

	// Store this watch in memory
	watchers.push({
		userId: message.author.id, // who asked
		channelId: message.channel.id, // where to notify
		date: dateArg // the date they want to watch
	});

	// Persist to disk
	saveWatchers();

	// delete the user's message
	const replyMessage = await message.reply(`Alright, I'm now watching for availability on **${dateArg}**!`);

	// delete both messages after a few seconds
	return setTimeout(() => {
		replyMessage.delete();
		message.delete();
	}, 5000);
}

/**
 * Checks private parking availability
 */
async function checkPrivateParkingAvailability() {
	if(!honkPromoCode) return;

	try {
		// create a new cart
		const cartHashId = await createCart();
		if(!cartHashId) throw new Error('Failed to create a new cart');
		// claim the cart
		const claimed = await claimCart(cartHashId);
		if(!claimed) throw new Error('Failed to claim the cart');
		// redeem the promo code
		const redeemedPromoCode = await redeemPromoCode(cartHashId, honkPromoCode);
		if(!redeemedPromoCode) throw new Error('Failed to redeem the promo code');

		console.log(`Created a new cart with hashid ${cartHashId}, claimed it, and redeemed promo code ${honkPromoCode} to get a private parking availability.`);
		// get the availability
		const privateAvailability = await fetchPrivateParkingAvailability(cartHashId);
		if(!privateAvailability) return;

		const fulfilledIndexes = processWatchersAvailability(privateAvailability);
		removeFulfilledWatchers(fulfilledIndexes);

		if(fulfilledIndexes.length > 0) {
			saveWatchers();
		}
	} catch(err) {
		console.error('Error checking private parking availability:', err);
	}
}

/**
 * Checks public parking availability
 */
async function checkPublicParkingAvailability() {
	const publicAvailability = await fetchPublicParkingAvailability();
	if(!publicAvailability) return;

	const fulfilledIndexes = processWatchersAvailability(publicAvailability);
	removeFulfilledWatchers(fulfilledIndexes);

	if(fulfilledIndexes.length > 0) {
		saveWatchers();
	}
}

/**
 * Checks for new availability every POLL_INTERVAL ms
 */
setInterval(async () => {
	if(watchers.length === 0) return;

	try {
		await checkPrivateParkingAvailability();
		await checkPublicParkingAvailability();
	} catch(err) {
		console.error('Error in polling:', err);
	}
}, POLL_INTERVAL);

/**
 * Processes the availability data and returns an array of fulfilled indexes
 * @param {object} availability - The availability data
 * @returns {number[]} An array of fulfilled indexes
 */
function processWatchersAvailability(availability) {
	const fulfilledIndexes = [];

	// Loop through each watcher and check if the availability data matches
	watchers.forEach((watch, index) => {
		const dateTime = Object.keys(availability).find((key) => key.startsWith(watch.date));
		if(!dateTime) {
			return console.log(`No availability data found for ${watch.date}. Skipping.`);
		}

		const dayInfo = availability[dateTime];
		const resDataKey = Object.keys(dayInfo).find((key) => key !== 'status');

		const {
			sold_out: soldOut,
			reservation_not_needed: resNotNeeded
		} = dayInfo.status || {};
		const {
			available: resAvailable,
			description: resDescription,
			price: resPrice
		} = dayInfo[resDataKey] || {};

		if(!soldOut && !resNotNeeded && resAvailable) {
			sendReservationEmbed(watch.channelId, watch.date, resDescription, resPrice);
			fulfilledIndexes.push(index);

			console.log(`Finished processing ${watch.date}. Reservation found.`);
		} else if(resNotNeeded) {
			sendNoReservationNeededEmbed(watch.channelId, watch.date, resDescription);
			fulfilledIndexes.push(index);

			console.log(`Finished processing ${watch.date}. No reservations needed.`);
		}
	});

	return fulfilledIndexes;
}

/**
 * Removes fulfilled watchers from the watchers array
 * @param {number[]} fulfilledIndexes - The fulfilled indexes
 */
function removeFulfilledWatchers(fulfilledIndexes) {
	fulfilledIndexes.reverse().forEach((i) => watchers.splice(i, 1));
}

// ------------------------
// LISTEN FOR COMMANDS
// ------------------------
client.on('messageCreate', (message) => {
	// Ignore self or other bots
	if(message.author.bot) return;

	// Example usage:  !watch 2025-03-14
	if(message.content.startsWith('!watch ')) {
		watchCommand(message);
	}
});

// ------------------------
// BOT LOGIN
// ------------------------
client.login(DISCORD_TOKEN).then(async () => {
	console.log('Bot is logged in and ready!');

	const promoCode = await fetchAccountPromoCodes();
	if(promoCode) {
		console.log(`Your HONK account has a season pass code: ${promoCode}`);
		honkPromoCode = promoCode;
	}
});