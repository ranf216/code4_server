module.exports = class
{
	constructor(session = null)
	{
		if (session !== null)
		{
			this.$Session = session;
		}
	}

}
