const mineflayer = require('mineflayer')
const collectBlock = require('mineflayer-collectblock').plugin
const pvp = require('mineflayer-pvp').plugin
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const { GoalBlock, GoalFollow,GoalNear } = goals  // <- GoalFollow must be here
const OpenAi = require('openai')

let done_spawn = false
const openAi = new OpenAi({
	        baseURL: 'https://api.deepseek.com',
	apiKey:'sk-7afac500e7834c88864919e34d3e8f08',
});

let chatHistory = "This is the chat history and respond toward the chat in short in one line speak chinese: "

async function askAI(prompt) {
    try {
        const response = await openAi.chat.completions.create({
            model: "deepseek-chat",   // DeepSeek-specific model
            messages: [
                {
                    role: "system",
                    content: "You are Herta, a bot created by The Herta and LZH(in mc he is call RiceBuckket). In the world of Minecraft, you assist your creator and friends to do jobs. " +
					"Respond according to the prompt and act like Herta bot in Honkai StarRail." +
					"The Herta is a bit of narcissist, and will only praise themselves or people she thinks that are interlecture. Condescenting to people she thinks are inferior to her. Speaks in an interlecture way."+
					"u can use command to control urself or talk natively. "+
					"you can use !follow [playername] to follow a player !unfollow to stop follow a player !mine [blockname] to mine a block !attack [playername] to attack a player !stopAttack to stop attack "+
					"the command always follow the format and always use a new line to do a comamnd \n![command] [detail]"
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7
        });

        return response.choices[0].message.content;

    } catch (err) {
        console.error("Error calling DeepSeek:", err);
        return null;
    }
}
//This filter the noisy noise
const originalLog = console.log;
console.log = (msg, ...args) => {
  // suppress only chunk size warnings
  if (typeof msg === 'string' && msg.includes('Chunk size is')) return;
  originalLog(msg, ...args);
};


const num_of_bot = 1

const owner = ['RiceBuckket','EnderRL','Lzh2.0','_EnderRL1334','ChickenWhitte']

// Helper to stringify objects safely
function pf(obj) {
  try { return JSON.stringify(obj) } catch(e) { return String(obj) }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const { once } = require('events')

// Async helper to toss a stack
async function tossStackAsync(bot, item) {
    return new Promise((resolve, reject) => {
        bot.tossStack(item, (err) => {
            if (err) reject(err)
            else resolve()
        })
    })
}

//garding function


let guardPos = null

// Assign the given location to be guarded
function guardArea (pos) {
  guardPos = pos

  // We we are not currently in combat, move to the guard pos
  if (!bot.pvp.target) {
    moveToGuardPos()
  }
}

// Cancel all pathfinder and combat
function stopGuarding () {
  guardPos = null
  bot.pvp.stop()
  bot.pathfinder.setGoal(null)
}

// Pathfinder to the guard position
function moveToGuardPos () {
  bot.pathfinder.setMovements(new Movements(bot))
  bot.pathfinder.setGoal(new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z))
}




async function RunCommand(bot,command,username)
{
	//chating
	if(command.startsWith('!chat '))
	{
		bot.chat(command.slice(6))
		
	}
	

	
	//following
	if(command.startsWith('!followMe'))
	{
		if(bot.username === "Herta1"){
			const player = bot.players[username]?.entity
			if(player) {
				const goal = new GoalFollow(player, 1) // follow at 1 block distance
				bot.pathfinder.setGoal(goal, true)     // true = dynamic goal, follows player
			}
		}
		else{
			const num = parseInt(bot.username.toString().slice(5)) - 1
			//console.log(num)

			const target = `Herta${num}`
						//console.log(target)
			const player = bot.players[target]?.entity
			if(player) {
				const goal = new GoalFollow(player, 1) // follow at 1 block distance
				bot.pathfinder.setGoal(goal, true)     // true = dynamic goal, follows player
			}
		}
	}
	else 	if(command.startsWith('!follow '))
	{
		const name = command.slice(8)
		const player = bot.players[name]?.entity
		if(player) {
				const goal = new GoalFollow(player, 1) // follow at 1 block distance
				bot.pathfinder.setGoal(goal, true)     // true = dynamic goal, follows player
		}
	}
	//unfollow
	if(command.startsWith('!unfollow'))
	{
		bot.pathfinder.setGoal(null)
	}
	
	//praise
	if(command.startsWith('!praiseMe'))
	{
		bot.chat(`黑塔女士和${username}举世无双！`)
		await sleep(1000)
		bot.chat(`黑塔女士和${username}聪明绝顶！`)
		await sleep(1000)
		bot.chat(`黑塔女士和${username}沉鱼落雁！`)
	}
	
	//automining
	if(command.startsWith('!mine '))
	{
		blockname = command.slice(6)
		// Get the correct block type
		const blockType = bot.mcData.blocksByName[blockname]
		if (!blockType) {
		bot.chat("I don't know any blocks with that name.")
		return
		}
		
		bot.chat('Collecting the nearest ' + blockType.name)
				
		const blocks = bot.findBlocks({
			matching: blockType.id,
			maxDistance: 64,
			count: 10
		})
		
		// Remove undefined/null entries just in case
		const validBlocks = blocks.filter(b => b != null)
		
		// Sort by distance to bot
		validBlocks.sort((a, b) => bot.entity.position.distanceTo(a) - bot.entity.position.distanceTo(b))
		
		// Pick nth nearest, e.g., 2nd nearest
		const num = parseInt(bot.username.toString().slice(5)) - 1 // 0 = nearest, 1 = 2nd nearest
		const targetPos = validBlocks[num]
		
		if (!targetPos) {
			bot.chat("I don't see that block nearby.")
			return
		}
		
		// Get the actual block object at that position
		const targetBlock = bot.blockAt(targetPos)
		
		// Dig it
		bot.pathfinder.setGoal(new GoalBlock(targetBlock.position.x, targetBlock.position.y, targetBlock.position.z))
		
		bot.once('goal_reached', async () => {
			try {
				await bot.dig(targetBlock)
				bot.chat(`Mined ${blockType.name} successfully!`)
			} catch (err) {
				bot.chat(`Failed to mine ${blockType.name}: ${err.message}`)
			}
		})
		
	}
	// At the top of your script, per bot:
	bot.attackInterval = null
	bot.defendInterval = null
	
	// --- inside RunCommand ---
	
	// Attack
	if(command.startsWith('!attack ')) {
		const targetName = command.slice(8).trim()
	
		const target = bot.players[targetName]?.entity ||
					Object.values(bot.entities).find(e => e.username === targetName || e.mobType === targetName)
	
		if(!target) {
			bot.chat(`I can't find ${targetName}!`)
			return
		}
	
		bot.chat(`Attacking ${targetName}...`)
	
		const { GoalFollow } = require('mineflayer-pathfinder').goals
		const goal = new GoalFollow(target, 2)
		bot.pathfinder.setGoal(goal, true)
	
		if(bot.attackInterval) clearInterval(bot.attackInterval)
	
		bot.attackInterval = setInterval(() => {
			if(!target || !target.isValid) {
				clearInterval(bot.attackInterval)
				bot.attackInterval = null
				bot.chat(`Stopped attacking ${targetName}.`)
				bot.pathfinder.setGoal(null)
				return
			}
			bot.attack(target)
		}, 300)
	}
	
	// Stop attack
	if(command.startsWith('!stopAttack')) {
		if(bot.attackInterval) {
			clearInterval(bot.attackInterval)
			bot.attackInterval = null
		}
		bot.pathfinder.setGoal(null)
		bot.chat('Stopped attacking.')
	}
	
	// Defend a player
	if(command.startsWith('!defend ')) {
		const playerName = command.slice(8).trim()
		const player = bot.players[playerName]?.entity
		if(!player) {
			bot.chat(`I can't find ${playerName} to defend!`)
			return
		}
	
		bot.chat(`Defending ${playerName}...`)
		guardArea(player.entity.position)
		}
	
	// Stop defending
	if(command.startsWith('!stopDefend')) {
    bot.chat('I will no longer guard this area.')
    stopGuarding()
	}

	if(command.startsWith('!serveMe'))
	{
		  // find player entity
		 playerName = username
		  
		const player = bot.players[username]?.entity
		if (!player) {
		bot.chat(`I can't find ${username} to give items.`)
		return
		}
		
		// store return position (current bot position)
		returnPos = bot.entity.position.clone()
		
		// go to near the player (within 2 blocks)
		bot.chat(`Going to ${username} to give items...`)
		bot.pathfinder.setGoal(new GoalNear(player.position.x, player.position.y, player.position.z),2, true)
		
		// wait until reached or timeout
		try {
		await onceEvent(bot, 'goal_reached', 30000) // resolves when pathfinder signals goal reached
		} catch (err) {
		// fallback: wait until near by checking distance
		let waited = 0
		while (bot.entity.position.distanceTo(player.position) > 3 && waited < 30000) {
			await sleep(500)
			waited += 500
		}
		}
	
		const items = bot.inventory.items() // array of Item objects
		if (items.length === 0) {
		bot.chat("I have no items to give.")
		} else {
		bot.chat(`Dropping ${items.length} item stacks for ${username}...`)
		// drop each stack; skip armor/equipment if you want:
		for (const item of items) {
			// optionally skip if item.slot is armor/equipment; example:
			// if (item.slot >= 100) continue
			try {
			await tossStackAsync(bot, item)
			await sleep(200) // tiny pause so player can pick up
			} catch (err) {
			bot.chat(`Failed to drop ${item.name}: ${err.message}`)
			}
		}
		bot.chat('Done dropping items.')
		}
	
	
	
	}
	
	if(command.startsWith('!fuck '))
	{
		let targetn = null
		if(message.length < 6)
		{
			targetn = username
		}
		else 
		{
			targetn = message.slice(6)
		}
		
		const target = bot.players[targetn]?.entity ||
				Object.values(bot.entities).find(e => e.username === targetn || e.mobType === targetn)
	
		if(!target) {
			bot.chat(`I can't find ${targetn}!`)
			return
		}
		
		bot.chat(`I am comming :D ${targetn}`)
		const { GoalFollow } = require('mineflayer-pathfinder').goals
		const goal = new GoalFollow(target, 0)
		bot.pathfinder.setGoal(goal, true)
	
		  let isSneaking = false
		let interval = setInterval(() => {
			isSneaking = !isSneaking
			bot.setControlState('sneak', isSneaking)
		}, 100)
		
		// stop after 10 seconds
		setTimeout(() => {
			clearInterval(interval)
			bot.setControlState('sneak', false)
			bot.chat('Damn Am Tired!!!!')
			bot.pathfinder.setGoal(null)
			
		}, 10000)
		
	}

	

    return 1;
}


function createBot(name) {
  const bot = mineflayer.createBot({
    host: 'endymining.ddns.net', // replace with your server IP if needed
    port: 25565,
    username: name,
    version: '1.21.8'
  })
  
  	  //this for load plugin
	      // Create mcData for this bot version
  bot.mcData = require('minecraft-data')(bot.version)
  bot.loadPlugin(pathfinder)
  bot.loadPlugin(collectBlock)
bot.loadPlugin(pvp)
  

  // --- connection / login events ---
  bot.on('login', () => console.log(`${name}: event -> login`))
  bot.once('spawn', () => {
	  
	    const defaultMove = new Movements(bot)
		bot.pathfinder.setMovements(defaultMove)


	  
	  console.log(`${name}: event -> spawn`)
	  setTimeout(() => { 
	  bot.chat('/register strong_password')
	  bot.chat('/l strong_password')
	  bot.chat('黑塔女士举世无双！')
	  },2000)
	 

	  
	  })
  bot.on('kicked', (reason) => console.log(`${name}: event -> kicked ->`, reason))
  bot.on('end', () => console.log(`${name}: event -> disconnected`))
  bot.on('error', err => console.log(`${name}: event -> error ->`, err && err.message ? err.message : pf(err)))
  
  // --- resource pack handling ---
// This is for Minecraft Version 1.20.3 - 1.21.8 (See https://prismarinejs.github.io/minecraft-data/?v=1.21.8&d=protocol#types.packet_common_add_resource_pack)
// The name of the received datapack was changed. Also now you have to send back the uuid instead of the hash code.
bot._client.on('add_resource_pack', (data) => {
    console.log(`Accept Server-Resource-Pack. url: ${data.url} , uuid: ${data.uuid}`);

    // result:
    // SUCCESSFULLY_LOADED: 0
    // DECLINED: 1
    // FAILED_DOWNLOAD: 2
    // ACCEPTED: 3
    bot._client.write('resource_pack_receive', { uuid: data.uuid, result: 3 }); // report that the resource-pack was accepted
    bot._client.write('resource_pack_receive', { uuid: data.uuid, result: 0 }); // report that the resource-pack was downloaded succesfully
});

	bot.counter = 5
	bot.asking = false

	// --- chat and messages ---
	bot.on('message', async (msg) => {
	const text = msg.toString() // full chat text
	console.log(`${name}: raw message -> ${text}`)
	
	chatHistory = chatHistory + text + "\n";
	
	if (bot.counter <= 0 && bot.username === 'Herta1' && done_spawn && !bot.asking) {
		bot.asking = true
		const responds = await askAI(chatHistory);
		const cut_respond = responds.split("\n");
	
		for (let i = 0; i < cut_respond.length; i++)
		{
			const context = cut_respond[i];
			console.log("AI" + context); 
			bot.chat(context); 
			
			await RunCommand(bot,context,username)
			await sleep(300)
		}
	
	

	
		chatHistory += "Herta1: " + responds + "\n";
		bot.counter = 3;
		await sleep(1000);
		bot.asking = false;
		return;
	} else {
		bot.counter -= 1;
	}
	
	console.log(bot.counter);

  // Match messages like "<RiceBuckket> !say hello"
  const match = text.match(/^<(\w+)> (.+)$/)
  const match2 = text.match(/^(?:\[DC\] )?<([^>]+)> (.+)$/)
  
  username = ''
  message = ''
  if(match)  // ignore non-player messages
  {
   username = match[1] // e.g., "RiceBuckket"
   message = match[2]  // e.g., "!say hello"
  }
  else if (match2)
	  {
   username = match2[1] // e.g., "RiceBuckket"
   message = match2[2]  // e.g., "!say hello"
  }  else return
  
  console.log(username)
  
  if(username === "Herta1") {
	  console.log("herta commanding")
	  RunCommand(bot,message,username);}
  
	if (username.startsWith('Herta')) return


	
	if(message.startsWith("fuck"))
	{
		bot.chat(`fuck ${username}`)
	}

  // Only allow trusted owners
  // Only respond to trusted owners
  if(!owner.includes(username)) return


  console.log(`${name} command from ${username}: ${message}`)
	
	//bot.chat(message)

	RunCommand(bot,message,username)

	
})

bot.on('raw', (packet) => {
    // ignore move_minecart or other noisy packets
    if(packet.name === 'move_minecart') return;
});



  // --- watchdog (optional, increased timeout) ---
  const WATCHDOG_TIMEOUT = 10000 // 60s
  let watchdog = setTimeout(() => {
    console.log(`${name} WATCHDOG: no spawn/login/kick/error within ${WATCHDOG_TIMEOUT/1000}s`)
  }, WATCHDOG_TIMEOUT)
  ;['spawn','login','kicked','end','error','message'].forEach(e => {
    bot.once(e, () => clearTimeout(watchdog))
  })
  
  // Called when the bot has killed it's target.
bot.on('stoppedAttacking', () => {
  if (guardPos) {
    moveToGuardPos()
  }
})

	
	// Check for new enemies to attack
bot.on('physicsTick', () => {
  if (!guardPos) return // Do nothing if bot is not guarding anything

  // Only look for mobs within 16 blocks
  const filter = e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 16 &&
                    e.displayName !== 'Armor Stand' // Mojang classifies armor stands as mobs for some reason?

  const entity = bot.nearestEntity(filter)
  if (entity) {
    // Start attacking
    bot.pvp.attack(entity)
  }
})
	


  return bot
}

// --- create multiple bots ---
const bots = []



async function spawnBots(num_of_bot) {

  for (let i = 1; i <= num_of_bot; i++) {
    const name = `Herta${i}`
    console.log(`Spawning bot: ${name}`)
    const bot = createBot(name)
    bots.push(bot)

    // wait 1 minute before spawning next bot
    await sleep(5000) // 60,000 ms = 1 minute
  }

  console.log("All bots created!")
  done_spawn = true
  return bots
}

// call it like:
spawnBots(num_of_bot)

// --- simple movement ---
if(done_spawn === true){
setInterval(() => {
  bots.forEach(bot => {
    bot.setControlState('jump', true)
    setTimeout(() => bot.setControlState('jump', false), 500)
  })
}, 5000)
}
