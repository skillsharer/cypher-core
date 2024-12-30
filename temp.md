example orchestrator agent

const liveDataGroup = [ agent group ]
- mempool agent: see current transactions in the bitcoin mempool
- marketplace agent: gets active market data for a given inscription/rune
- twitter sentiment agent: tracks the timeline for sentimnent of a project

const orchestrator = new orchestrator(liveDataGroup)

terminal agent runs command:
"get-data i need data on what the community is saying about quantum cats + current market data"

orchestrator agent recieves the above inquiry
- decides what agents from the group to call, and what instructions
in order:
- marketplace agent: gives goal "get the current market data for the collection quantum cats"
- twitter sentiment agent: gives goal "get the current sentiment of the community for the collection quantum cats"

both agents run their own tools they know how to use, return the data to the orchestrator agent

orchestrator agent returns the data to the terminal agent

agent 1 gets data
then passes it to agent 2
then passes it to agent 3
then returns to orchestrator agent

orchestrator tool:
- pick the agent name
- give the agent a goal