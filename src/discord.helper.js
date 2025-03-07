/**
 * Sends a reservation embed to the specified channel
 * @param {Discord.Client} client - The Discord client
 * @param {object} params - The parameters
 * @param {string} params.channelId - The channel ID
 * @param {string} params.watchDate - The watch date
 * @param {string} params.resDescription - The reservation description
 * @param {number} params.resPrice - The reservation price
 */
function sendReservationEmbed(client, {
	channelId,
	watchDate,
	resDescription,
	resPrice
}) {
	client.channels
		.fetch(channelId)
		.then((channel) => {
			channel.send({
				embeds: [{
					title: `Parking is available for ${watchDate}`,
					description: `Reservation Description: ${resDescription}`,
					fields: [{
						name: 'Price',
						value: `$${resPrice}`
					},
					{
						name: 'Link',
						value: 'https://reserve.altaparking.com/select-parking'
					}
					],
					footer: {
						text: 'Alta Parking Reservations'
					},
					color: 0x00ff00,
					timestamp: new Date()
				}]
			});
		})
		.catch(console.error);
}

/**
 * Sends a no reservation needed embed to the specified channel
 * @param {Discord.Client} client - The Discord client
 * @param {object} params - The parameters
 * @param {string} params.channelId - The channel ID
 * @param {string} params.watchDate - The watch date
 * @param {string} params.resDescription - The reservation description
 */
function sendNoReservationNeededEmbed(client, {
	channelId,
	watchDate,
	resDescription
}) {
	client.channels
		.fetch(channelId)
		.then((channel) => {
			channel.send({
				embeds: [{
					title: `Parking reservation not needed for ${watchDate}`,
					description: `Reservation Description: ${resDescription}`,
					fields: [{
						name: 'Link',
						value: 'https://reserve.altaparking.com/select-parking'
					}],
					footer: {
						text: 'Alta Parking Reservations'
					},
					color: 0x00ff00,
					timestamp: new Date()
				}]
			});
		})
		.catch(console.error);
}

module.exports = {
	sendReservationEmbed,
	sendNoReservationNeededEmbed
};