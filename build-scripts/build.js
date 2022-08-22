const {execSync} = require("child_process");
const axios = require('axios').default;

const TRACKER_TOKEN_ENV_NAME = 'TRACKER_TOKEN'
const TICKET_ID = 'INFRA-35'

const setReleaseDataToTicket = async (summary, description) => {
  const response = await axios.patch(`https://api.tracker.yandex.net/v2/issues/${TICKET_ID}`, {
    summary, description,
  }, {
    headers: {
      'Authorization': `OAuth ${process.env[TRACKER_TOKEN_ENV_NAME]}`,
      'X-Org-ID': '7261414'
    },
  })

  if (response.status !== 200) {
    throw new Error(`invalid response ${response.statusText}`)
  }

  return response.data
}

const getLatestTags = () => {
  const latestTagsOutput = execSync('git describe --tags $(git rev-list --tags --max-count=2) --always').toString()
  const [lastTag, previousTag] = latestTagsOutput.split('\n')
  return {
    latestTag: lastTag.startsWith("rc-") ? lastTag : undefined,
    previousTag: previousTag.startsWith("rc-") ? previousTag : undefined,
  }
}

const getDiffBetweenTagsFromGit = (tag1, tag2) => {
  const output = execSync(`git log --pretty="%h%x20%an%x20%s" ${tag1}${tag2 !== undefined ? `..${tag2}` : ''}`).toString()
  return output.split('\n').filter(elem => !!elem)
}

const getCommitsBetweenTags = (obj) => {
  const latestTag = obj.latestTag
  const previousTag = obj.previousTag
  if (previousTag === undefined) {
    return getDiffBetweenTagsFromGit(latestTag)
  }

  return getDiffBetweenTagsFromGit(previousTag, latestTag)
}

const createTicketSummary = (latestTag) => {
  const humanReadableDate = (new Date()).toLocaleDateString('ru-RU', { year: 'numeric', month: 'numeric', day: 'numeric' })
  return `Релиз №${latestTag.replace('rc-', '')} от ${humanReadableDate}`
}

const createTicketDescription = (latestTag, commits) => {
  let res = `ответственный за релиз TODO
коммиты, попавшие в релиз:
`
  commits.forEach(commit => {
    res += `${commit}\n`
  })

  return res
}

function main() {
  const tagsObject = getLatestTags()
  const commitsInRelease = getCommitsBetweenTags(tagsObject)
  const {latestTag} = tagsObject;

  setReleaseDataToTicket(createTicketSummary(latestTag), createTicketDescription(latestTag, commitsInRelease))
}

main()

