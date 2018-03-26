// ==UserScript==
// @name        Scratch Messenger
// @namespace   ScratchMessenger
// @author      Zro617
// @description Lets you quickly write a message directly to the author of a forum post on Scratch
// @include     https://scratch.mit.edu/discuss/topic/*
// @version     2.0
// @grant       none
// ==/UserScript==

const csrf   = document.cookie.match(/scratchcsrftoken=([0-9a-zA-Z]+)/)[1]
const maxlen = 500
const interval = 3000
const cooldown = 30000

var posts = Array.from(document.querySelectorAll('.blockpost.roweven.firstpost'))
var users = Array.from(document.querySelectorAll('.black.username'), u => u.innerHTML.trim())
var lastMessageTime = 0

for (var p = 0, post, user; p < posts.length; p++) {
	post = posts[p]
	user = users[p]
	
	var msgauthor = document.createElement('li')
	var btn       = document.createElement('a')
	btn.id = user
	btn.innerHTML = 'Message ' + user
	btn.addEventListener('click', prepareMessenger)
	msgauthor.appendChild(btn)
	msgauthor.appendChild(document.createTextNode(' | '))
	var ul = post.querySelector('.postfootright>ul')
	ul.insertBefore(msgauthor, ul.firstChild.nextSibling)
}

function prepareMessenger(e) {
	// spam prevention
	if (Date.now() - lastMessageTime < 30000) {
		return alert('Please wait 30 seconds before messaging again.')
	}
	
	var comment = prompt(`Message to ${user}:`)
	if (!comment) return; // canceled
	comment = chunkify(comment)
	lastMessageTime = Date.now()
	
	var btn  = e.target
	var user = e.target.id
	var parentid = ''

	btn.innerHTML = 'Sending...'
	
	function chunk() {
		if (comment.length == 0) {
			console.log('Finished sending')
			btn.innerHTML = 'Message sent'
			return setTimeout(()=>btn.innerHTML='Message '+user,cooldown-(Date.now()-lastMessageTime))
		}
		
		sendComment(user, comment.shift(), parentid, (err, xhr) => {
			if (err) return console.log('Chunk failed to send:', xhr.response)
			console.log('Chunk sent')
			if (!parentid) {
				// can't user querySelector, seriously?!?!
				parentid = xhr.responseXML.getElementsByClassName('comment')[0].getAttribute('data-comment-id')
				console.log('Parent comment ID retrieved: %s', parentid)
			}
			// avoid triggering spam filter
			setTimeout(chunk, interval)
		})
	}
	
	chunk()
}

function chunkify(comment) {
	var chunks = []
	while (comment.length > maxlen) {
		chunks.push(comment.substring(0, maxlen - 3) + '...')
		comment = comment.substring(maxlen -3)
	}
	chunks.push(comment)
	return chunks
}

function sendComment(user, content, parent_id, callback) {
	var xhr = new XMLHttpRequest()
	xhr.open('POST', `https://scratch.mit.edu/site-api/comments/user/${user}/add/`, true)
	xhr.responseType = 'document'
	xhr.setRequestHeader('X-CSRFToken', csrf)
	xhr.onload = function () {
		callback(xhr.status != 200, xhr)
	}
	xhr.send(JSON.stringify({
		content,
		parent_id,
		commentee_id: ''
	}))
}