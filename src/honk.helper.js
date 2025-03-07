const HONK_AUTH_TOKEN = process.env.HONK_AUTH_TOKEN;
const HONK_GUID = process.env.HONK_GUID;

/**
 * Fetches account promo codes
 * @returns {string} The latest promo code
 */
async function fetchAccountPromoCodes() {
	const response = await fetch('https://platform.honkmobile.com/graphql?honkGUID=' + HONK_GUID, {
		method: 'POST',
		headers: {
			accept: '*/*',
			'accept-language': 'en-US,en;q=0.9,af;q=0.8',
			'cache-control': 'no-cache',
			'content-type': 'application/json',
			pragma: 'no-cache',
			priority: 'u=1, i',
			'sec-ch-ua': '"Not(A:Brand";v="99", "Brave";v="133", "Chromium";v="133"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'cross-site',
			'sec-gpc': '1',
			'x-authentication': HONK_AUTH_TOKEN
		},
		referrer: 'https://reserve.altaparking.com/',
		referrerPolicy: 'strict-origin-when-cross-origin',
		body: JSON.stringify({
			operationName: 'AccountPromoCodes',
			variables: { rsvpPortalId: '2Gh4' },
			query: `fragment CorePromoCodeFields on PromoCode {
	hashid
	redeemCode
	shortDesc
	totalUses
	totalUsesCount
	expiry
	__typename
  }
  
  query AccountPromoCodes($rsvpPortalId: ID) {
	v2AccountPromoCodes(rsvpPortalId: $rsvpPortalId) {
	  ...CorePromoCodeFields
	  timezone
	  startDate
	  expiry
	  locationIds
	  promoCodesRates {
		activeSessionLimit
		activeSessionCount
		rate {
		  hashid
		  description
		  zone {
			hashid
			__typename
		  }
		  __typename
		}
		__typename
	  }
	  __typename
	}
  }
  `
		}),
		mode: 'cors',
		credentials: 'omit'
	});

	const data = await response.json();
	const promoCodes = data?.data?.v2AccountPromoCodes;
	if(!promoCodes || promoCodes.length === 0) {
		return null;
	}

	let latestPromo = promoCodes[0];
	for(const code of promoCodes) {
		if(new Date(code.expiry) > new Date(latestPromo.expiry)) {
			latestPromo = code;
		}
	}

	return latestPromo.redeemCode;
}

/**
 * Creates a cart on Honk
 * @returns {string} The cartId
 */
async function createCart() {
	const response = await fetch('https://platform.honkmobile.com/graphql?honkGUID=' + HONK_GUID, {
		method: 'POST',
		headers: {
			accept: '*/*',
			'accept-language': 'en-US,en;q=0.9,af;q=0.8',
			'cache-control': 'no-cache',
			'content-type': 'application/json',
			pragma: 'no-cache',
			priority: 'u=1, i',
			'sec-ch-ua': '"Not(A:Brand";v="99", "Brave";v="133", "Chromium";v="133"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'cross-site',
			'sec-gpc': '1',
			'x-authentication': HONK_AUTH_TOKEN
		},
		referrer: 'https://reserve.altaparking.com/',
		referrerPolicy: 'strict-origin-when-cross-origin',
		body: JSON.stringify({
			operationName: 'CreateCart',
			variables: {
				input: {
					startTime: '2024-10-01T08:00:00-06:00',
					zoneId: 'elP1Tp',
					productType: 'RESERVE'
				}
			},
			query: `
			mutation CreateCart($input: CreateCartInput!) {
			  createCart(input: $input) {
			  	cart {
				  hashid
				  __typename
				}
				errors
				__typename
			  }
			}
		`
		}),
		mode: 'cors',
		credentials: 'omit'
	});

	const data = await response.json();

	return data?.data?.createCart?.cart?.hashid || null;
}

/**
 * Claims a cart on Honk
 * @param {string} cartHashId - The cart hashid
 * @returns {boolean} True if the cart was claimed, false otherwise
 */
async function claimCart(cartHashId) {
	const response = await fetch('https://platform.honkmobile.com/graphql?honkGUID=' + HONK_GUID, {
		method: 'POST',
		headers: {
			accept: '*/*',
			'accept-language': 'en-US,en;q=0.9,af;q=0.8',
			'cache-control': 'no-cache',
			'content-type': 'application/json',
			pragma: 'no-cache',
			priority: 'u=1, i',
			'sec-ch-ua': '"Not(A:Brand";v="99", "Brave";v="133", "Chromium";v="133"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'cross-site',
			'sec-gpc': '1',
			'x-authentication': HONK_AUTH_TOKEN
		},
		referrer: 'https://reserve.altaparking.com/',
		referrerPolicy: 'strict-origin-when-cross-origin',
		body: JSON.stringify({
			operationName: 'ClaimCart',
			variables: {
				input: {
					id: cartHashId
				}
			},
			query: `
			mutation ClaimCart($input: ClaimCartInput!) {
			  claimCart(input: $input) {
				cart {
				  hashid
				  __typename
				}
				errors
				__typename
			  }
			}
		`
		}),
		mode: 'cors',
		credentials: 'omit'
	});

	const data = await response.json();
	const claimedHash = data?.data?.claimCart?.cart?.hashid;

	// If the hashid matches what we sent, we'll consider it "claimed".
	return claimedHash === cartHashId;
}

/**
 * Redeems a promo code on Honk
 * @param {string} cartId - The cart hashid
 * @param {string} promoCode - The promo code
 * @returns {boolean} True if the promo code was redeemed, false otherwise
 */
async function redeemPromoCode(cartId, promoCode) {
	const response = await fetch('https://platform.honkmobile.com/graphql?honkGUID=' + HONK_GUID, {
		method: 'POST',
		headers: {
			accept: '*/*',
			'accept-language': 'en-US,en;q=0.9,af;q=0.8',
			'cache-control': 'no-cache',
			'content-type': 'application/json',
			pragma: 'no-cache',
			priority: 'u=1, i',
			'sec-ch-ua': '"Not(A:Brand";v="99", "Brave";v="133", "Chromium";v="133"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'cross-site',
			'sec-gpc': '1',
			'x-authentication': 'c24aa09ed44948638bd60b3dbdd76b4e'
		},
		referrer: 'https://reserve.altaparking.com/',
		referrerPolicy: 'strict-origin-when-cross-origin',
		body: JSON.stringify({
			operationName: 'AddPromoToCart',
			variables: {
				input: {
					cartId,
					promoCode,
					validate: false
				}
			},
			query: `
        mutation AddPromoToCart($input: AddPromoToCartInput!) {
          addPromoToCart(input: $input) {
            cart {
              hashid
              promoCode {
                hashid
                shortDesc
                redeemCode
                promoCodesRates {
                  rate {
                    hashid
                    description
                    zone {
                      hashid
                      __typename
                    }
                    __typename
                  }
                  __typename
                }
                __typename
              }
              __typename
            }
            errors
            __typename
          }
        }
      `
		}),
		mode: 'cors',
		credentials: 'omit'
	});

	const data = await response.json();
	const result = data?.data?.addPromoToCart;
	if(!result) {
		return false;
	}

	const cart = result.cart;
	const errors = result.errors;

	// Return true if there are no errors and the cart now shows the redeemed promo code
	return !!cart && errors.length === 0 && cart.promoCode?.redeemCode === promoCode;
}

/**
 * Fetches the private parking availability data
 * @param {string} cartId - The cartId string
 * @param {string} cartStartTime - The cartStartTime string
 * @param {number} year - The year to fetch the data for
 * @returns {object} The parking availability data
 */
async function fetchPrivateParkingAvailability(cartId, cartStartTime, year) {
	const response = await fetch(
		'https://platform.honkmobile.com/graphql?honkGUID=' + HONK_GUID, {
			method: 'POST',
			headers: {
				accept: '*/*',
				'accept-language': 'en-US,en;q=0.9,af;q=0.8',
				'cache-control': 'no-cache',
				'content-type': 'application/json',
				pragma: 'no-cache',
				priority: 'u=1, i',
				'sec-ch-ua': '"Not(A:Brand";v="99", "Brave";v="133", "Chromium";v="133"',
				'sec-ch-ua-mobile': '?0',
				'sec-ch-ua-platform': '"macOS"',
				'sec-fetch-dest': 'empty',
				'sec-fetch-mode': 'cors',
				'sec-fetch-site': 'cross-site',
				'sec-gpc': '1',
				'x-authentication': HONK_AUTH_TOKEN
			},
			referrer: 'https://reserve.altaparking.com/',
			referrerPolicy: 'strict-origin-when-cross-origin',
			body: JSON.stringify({
				operationName: 'PrivateParkingAvailability',
				variables: {
					id: '72U6',
					cartId,
					cartStartTime,
					startDay: 60,
					endDay: 120,
					year
				},
				query: `
			  query PrivateParkingAvailability(
				$id: ID!,
				$cartId: ID!,
				$cartStartTime: String!,
				$startDay: Int!,
				$endDay: Int!,
				$year: Int!
			  ) {
				privateParkingAvailability(
				  id: $id
				  cartId: $cartId
				  cartStartTime: $cartStartTime
				  startDay: $startDay
				  endDay: $endDay
				  year: $year
				)
			  }
			`
			}),
			mode: 'cors',
			credentials: 'omit'
		}
	);

	const data = await response.json();
	if(!data?.data?.privateParkingAvailability) {
		console.error('Unexpected response:', data);
		if(data?.errors) {
			console.error('Errors:', data.errors[0]);
		}

		return null;
	}

	return data.data?.privateParkingAvailability;
}

/**
 * Fetches the public parking availability data
 * @param {string} cartStartTime - The cartStartTime string
 * @param {number} year - The year to fetch the data for
 * @returns {object} The parking availability data
 */
async function fetchPublicParkingAvailability(cartStartTime, year) {
	const response = await fetch(
		'https://platform.honkmobile.com/graphql?honkGUID=' + HONK_GUID, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-authentication': HONK_AUTH_TOKEN
			},
			body: JSON.stringify({
				operationName: 'PublicParkingAvailability',
				variables: {
					id: '72U6',
					cartStartTime,
					startDay: 60,
					endDay: 120,
					year
				},
				query: `
			query PublicParkingAvailability(
			  $id: ID!,
			  $cartStartTime: String!,
			  $startDay: Int!,
			  $endDay: Int!,
			  $year: Int!
			) {
			  publicParkingAvailability(
				id: $id
				cartStartTime: $cartStartTime
				startDay: $startDay
				endDay: $endDay
				year: $year
			  )
			}
		  `
			})
		}
	);

	const data = await response.json();
	if(!data?.data?.publicParkingAvailability) {
		console.error('Unexpected response:', data);

		return null;
	}

	return data.data?.publicParkingAvailability;
}

module.exports = {
	fetchPrivateParkingAvailability,
	fetchPublicParkingAvailability,
	fetchAccountPromoCodes,
	createCart,
	claimCart,
	redeemPromoCode
};