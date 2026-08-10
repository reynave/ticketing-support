declare var apiBaseUrl: string;
declare var production: any;
export const environment = {
	apiBaseUrl: apiBaseUrl,
	production: production || true,
	//apiBaseUrl: 'https://crm.co.id/api',
	// apiBaseUrl: 'https://crm.co.id/api-dev/'
};
