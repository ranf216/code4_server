const fs = require('fs');
const ltrim = require('ltrim');

const PhoneNumber = class
{
    constructor()
	{
        this.dialingCode = null;
        this.phoneNumber = null;
        this.countryCode = null;
        this.countryName = null;
        this.intlFormat = null;
    }
}

const CountryUtils = class
{
    constructor()
    {
        this.countryCodeArray = null;
        this.countryDialingCodeArray = null;
        this.countryNameArray = null;
    }

	parseIntlPhoneNumber(phone)
	{
		const dc = this.getCountriesByDialingCode();
		phone = ltrim(phone, "+");
		
		let code = phone.substring(0, 4);
		if (!$Utils.empty(dc[code]))
		{
			const pn = new PhoneNumber();
			pn.dialingCode = code;
			pn.phoneNumber = ltrim(phone.substring(4), "0");
			pn.countryCode = dc[code].code;
			pn.countryName = dc[code].name;
			pn.intlFormat = "+" + code + pn.phoneNumber;
			return pn;
		}
		
		code = phone.substring(0, 3);
		if (!$Utils.empty(dc[code]))
		{
			const pn = new PhoneNumber();
			pn.dialingCode = code;
			pn.phoneNumber = ltrim(phone.substring(3), "0");
			pn.countryCode = dc[code].code;
			pn.countryName = dc[code].name;
			pn.intlFormat = "+" + code + pn.phoneNumber;
			return pn;
		}
		
		code = phone.substring(0, 2);
		if (!$Utils.empty(dc[code]))
		{
			const pn = new PhoneNumber();
			pn.dialingCode = code;
			pn.phoneNumber = ltrim(phone.substring(2), "0");
			pn.countryCode = dc[code].code;
			pn.countryName = dc[code].name;
			pn.intlFormat = "+" + code + pn.phoneNumber;
			return pn;
		}
		
		code = phone.substring(0, 1);
		if (!$Utils.empty(dc[code]))
		{
			const pn = new PhoneNumber();
			pn.dialingCode = code;
			pn.phoneNumber = ltrim(phone.substring(1), "0");
			pn.countryCode = dc[code].code;
			pn.countryName = dc[code].name;
			pn.intlFormat = "+" + code + pn.phoneNumber;
			return pn;
		}
		
		return null;
	}

	getCountryCodesByName(lang = null)
	{
		if ($Utils.empty(lang))
		{
			lang = $Config.get("default_language");
		}

		if (this.countryNameArray == null)
		{
			this.countryNameArray = {};
		}

		if (!$Utils.isset(this.countryNameArray[lang]))
		{
			let file = $Const.INFRA_ROOT + "/platform/data/country_codes_by_name." + lang + ".json";
			if (!fs.existsSync(file))
			{
				file = $Const.INFRA_ROOT + "/platform/data/country_codes_by_name." + $Config.get("default_language") + ".json";
			}

			this.countryNameArray[lang] = fs.readFileSync(file, 'utf8');
		}
		
		return JSON.parse(this.countryNameArray[lang]);
	}

	getCountriesByCode(lang = null)
	{
		if ($Utils.empty(lang))
		{
			lang = $Config.get("default_language");
		}

		if (this.countryCodeArray == null)
		{
			this.countryCodeArray = {};
		}

		if (!$Utils.isset(this.countryCodeArray[lang]))
		{
			let file = $Const.INFRA_ROOT + "/platform/data/countries_by_code." + lang + ".json";
			if (!fs.existsSync(file))
			{
				file = $Const.INFRA_ROOT + "/platform/data/countries_by_code." + $Config.get("default_language") + ".json";
			}

			this.countryCodeArray[lang] = fs.readFileSync(file, 'utf8');
		}

		return JSON.parse(this.countryCodeArray[lang]);
	}

	getCountriesByDialingCode(lang = null)
	{
		if ($Utils.empty(lang)) 
		{
			lang = $Config.get("default_language");
		}

		if (this.countryDialingCodeArray == null)
		{
			this.countryDialingCodeArray = {};
		}

		if (!$Utils.isset(this.countryDialingCodeArray[lang]))
		{
			let file = $Const.INFRA_ROOT + "/platform/data/countries_by_dialing_code." + lang + ".json";
			if (!fs.existsSync(file))
			{
				file = $Const.INFRA_ROOT + "/platform/data/countries_by_dialing_code." + $Config.get("default_language") + ".json";
			}

			this.countryDialingCodeArray[lang] = fs.readFileSync(file, 'utf8');
		}
		
		return JSON.parse(this.countryDialingCodeArray[lang]);
	}

	removeUnwantedPhoneChars(phone)
	{
		return phone.replace(/ /g, "")
		            .replace(/\s+/g, ' ')
                    .replace(/\t+/g, '')
                    .trim()
		            .replace(/\-/g, "")
		            .replace(/\./g, "")
		            .replace(/\)/g, "")
		            .replace(/\(/g, "")
		            .replace(/[^0-9+,.]/g, "");
	}
	
	removeUnwantedCountryCodeChars(phone)
    {
		return phone.replace(" ", "")
		            .replace(/\s+/g, ' ')
                    .replace(/\t+/g, '')
                    .trim()
		            .replace(/\-/g, "")
		            .replace(/\./g, "")
		            .replace(/\)/g, "")
		            .replace(/\(/g, "")
	}
}

const countryUtils = new CountryUtils();

module.exports =
{
	makeIntlPhoneNumber(phone, countryCode = "")
	{
		if (phone.startsWith("+"))
		{
			phone = countryUtils.parseIntlPhoneNumber(phone).intlFormat;
		}
		else
		{
			if ($Utils.empty(countryCode))
			{
				countryCode = $Config.get("default_phone_country_code");
			}

			const dc = countryUtils.getCountriesByDialingCode();
			if ($Utils.empty(dc[countryCode]))
			{
				const cc = countryUtils.getCountriesByCode();
				countryCode = countryCode.toUpperCase();
				
				if ($Utils.empty(cc[countryCode]))
				{
					return "";
				}
				
				countryCode = cc[countryCode].code;
			}
		}
		
		
		countryCode = countryUtils.removeUnwantedCountryCodeChars(countryCode);
		phone = countryUtils.removeUnwantedPhoneChars(phone);
		phone = ltrim(phone, "0");
		
		if ($Utils.empty(phone))
		{
			phone = "";
		}
		else if (!phone.startsWith("+"))
		{
			phone = "+" + countryCode + phone; 
		}
		
		return phone;
	},

	getIntlPhoneNumber(phoneNumber, countryCode = "")
	{
		const number = this.makeIntlPhoneNumber(phoneNumber, countryCode);
		if ($Utils.empty(number))
		{
			return null;
		}

		const phoneNumberObj = countryUtils.parseIntlPhoneNumber(number);
		if ($Utils.empty(phoneNumberObj))
		{
			return null;
		}

		if (!$Utils.empty(countryCode) && Number(countryCode) != countryCode)
		{
			if (phoneNumberObj.countryCode != countryCode.toUpperCase())
			{
				phoneNumberObj.countryCode = countryCode.toUpperCase();
				phoneNumberObj.countryName = this.getCountryNameByCode(countryCode);
			}
		}

		return phoneNumberObj;
	},

	isValidCountryCode(countryCode)
	{
		const cc = countryUtils.getCountriesByCode();
		countryCode = countryCode.toUpperCase();
		
		return !$Utils.empty(cc[countryCode]);
	},

	getCountryNameByCode(countryCode)
	{
		const cc = countryUtils.getCountriesByCode();
		countryCode = countryCode.toUpperCase();
		
		if ($Utils.empty(cc[countryCode]))
		{
			return null;
		}

		return cc[countryCode].name;
	},

	getCountryByCode(countryCode)
	{
		const cc = countryUtils.getCountriesByCode();
		countryCode = countryCode.toUpperCase();
		
		if ($Utils.empty(cc[countryCode]))
		{
			return null;
		}

		return cc[countryCode];
	},

	getCountryNameByDialingCode(dialingCode)
	{
		const cc = countryUtils.getCountriesByDialingCode();
		
		if ($Utils.empty(cc[dialingCode]))
		{
			return null;
		}

		return cc[dialingCode].name;
	},

	getCountryByDialingCode(dialingCode)
	{
		const cc = countryUtils.getCountriesByDialingCode();
		
		if ($Utils.empty(cc[dialingCode]))
		{
			return null;
		}

		return cc[dialingCode];
	},

	getCountryCodesByName(lang = null)
	{
		return countryUtils.getCountryCodesByName(lang);
	},

	getCountryNamesByCodes()
	{
		const cc = countryUtils.getCountriesByCode();
		const retArr = {};

        Object.entries(cc).forEach(function(ccObj)
        {
            const code = ccObj[0];
            const data = ccObj[1];

			retArr[code] = data.name;
		});

		return retArr;
	},
}
