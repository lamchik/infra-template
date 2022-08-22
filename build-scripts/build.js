const {execSync} = require("child_process");
const axios = require('axios').default;

const TRACKER_TOKEN_ENV_NAME = 'TRACKER_TOKEN'
const TICKET_ID = 'INFRA-35'

const setReleaseDataToTicket = async (summary, description) => {
  console.log("Updating ticket summary and description")
  const response = await axios.patch(`https://api.tracker.yandex.net/v2/issues/${TICKET_ID}`, {
    summary, description,
  }, {
    headers: {
      'Authorization': `OAuth ${process.env[TRACKER_TOKEN_ENV_NAME]}`,
      'X-Org-ID': '7261414'
    },
  })

  if (response.status > 299) {
    const err = `invalid response ${response.statusText} with code ${response.status}`
    throw new Error(err)
  }

  console.log("Successfully updated ticket summary and description")
  return response.data
}

const addCommentToTicket = async (comment) => {
  console.log("Adding comment to ticket")
  const response = await axios.post(`https://api.tracker.yandex.net/v2/issues/${TICKET_ID}/comments`, {
    text: comment
  }, {
    headers: {
      'Authorization': `OAuth ${process.env[TRACKER_TOKEN_ENV_NAME]}`,
      'X-Org-ID': '7261414'
    },
  })

  if (response.status > 299) {
    const err = `invalid response ${response.statusText} with code ${response.status}`
    throw new Error(err)
  }

  console.log("Successfully commented ticket")
  return response.data
}

const getLatestTags = () => {
  console.log("Getting the latest tags from git")
  const latestTagsOutput = execSync('git describe --tags $(git rev-list --tags --max-count=2) --always').toString()
  const [lastTag, previousTag] = latestTagsOutput.split('\n')
  console.log(`Successfully got the latest tags from git. Latest — ${lastTag}, previous — ${previousTag}`)
  return {
    latestTag: lastTag.startsWith("rc-") ? lastTag : undefined,
    previousTag: previousTag.startsWith("rc-") ? previousTag : undefined,
  }
}

const getDiffBetweenTagsFromGit = (tag1, tag2) => {
  console.log("Getting commits between tags")
  const output = execSync(`git log --pretty="%h%x20%an%x20%s" ${tag1}${tag2 !== undefined ? `..${tag2}` : ''}`).toString()
  console.log("Successfully got all commits between tags")
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
  let res = `ответственный за релиз ${process.env.ACTOR}
коммиты, попавшие в релиз:
`
  commits.forEach(commit => {
    res += `${commit}\n`
  })

  return res
}

const dockerBuild = (tag) => {
  const formattedTag = tag.replace('-', ':')
  console.log("Building image with tag", formattedTag)
  execSync(`docker build . --tag ${formattedTag}`, {stdio: 'inherit'})
  console.log(`Image with tag ${formattedTag} successfully built`)
  return formattedTag

}

const createTicketComment = (tag) => {
  return `Собрали образ в тегом ${tag}`
}

async function main(){
  const tagsObject = getLatestTags()
  const commitsInRelease = getCommitsBetweenTags(tagsObject)
  const {latestTag} = tagsObject;

  await setReleaseDataToTicket(createTicketSummary(latestTag), createTicketDescription(latestTag, commitsInRelease))
  const dockerTag = dockerBuild(latestTag)
  await addCommentToTicket(createTicketComment(dockerTag))
}

main()

