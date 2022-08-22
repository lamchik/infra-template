const axios = require('axios').default;

const TRACKER_API_TOKEN = 'y0_AgAAAAAgPBYLAAhYSAAAAADM5H69R7exA48OTtep5JPLRlweToJAyNQ'
const TICKET_ID = 'INFRA-35'

const setReleaseDataToTicket = async (releaseTag, description) => {
  const humanReadableDate = (new Date()).toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const response = await axios.patch(`https://api.tracker.yandex.net/v2/issues/${TICKET_ID}`, {
    summary: `Новый релиз: ${releaseTag}, дата — ${humanReadableDate}`,
    description,
  }, {
    headers: {
      'Authorization': `OAuth ${TRACKER_API_TOKEN}`,
      'X-Org-ID': '7261414'
    },
  })

  if (response.status !== 200) {
    throw new Error(`invalid response ${response.statusText}`)
  }

  return response.data
}

// setReleaseDataToTicket("rc-0.0.1", "Описание задачи")

