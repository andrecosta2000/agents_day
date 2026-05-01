// Mirrors Member 1's getSupportedCities() — shared between server and client.
export const SUPPORTED_CITIES = [
	"Amsterdam",
	"Barcelona",
	"Berlin",
	"Boston",
	"Chicago",
	"Dubai",
	"Lisbon",
	"London",
	"Los Angeles",
	"Madrid",
	"New York",
	"Paris",
	"Porto",
	"San Francisco",
	"Seattle",
] as const;

export type SupportedCity = (typeof SUPPORTED_CITIES)[number];
