# Alta Parking Reservations Bot

This is a Discord bot that watches for parking availability in Alta Parking reservations.

If your HONK credentials have a season pass code, the bot will check for private parking availability BEFORE checking for public parking availability.
Public and private parking are separate pools of spots, with public being $25.00 and private being $0.00.

## Notes
- All requests to the Alta Parking reservations API are in the honk.helper.js file.
- Make sure to fill out a .env file based on the .env.example file.
- Database is a simple JSON file so it is lightweight and easy to manage.

## Commands

- `!watch <date>` - Watches for parking availability on the specified date. Date format is `YYYY-MM-DD`.