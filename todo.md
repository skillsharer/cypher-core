to do:

i have to modularize existing cypher genesis components, specifically database, memories, notes, & twitter- make the rest custom
- add twitter commands as a modular tool (DONE, figure out supabase database )
- add note taking as a tool, add notes, view notes (vd query), edit notes, delete notes
- add memories as a tool
- make the core terminal personality something easy to edit 


the goal is to create a AI computer system that has new seeds daily so everyday is unique. the art is in the unknown of what the ai will do today, and how the ai grows overtime


turning the terminalLoop into a terminal agent itself with tools

- similar to the infinite backrooms script, we have cliUser (satoshi) interacting with the terminal (cliAgent)
- to actually connect the cliAgent with real commands, we give it tools and function calling, with the ability to talk back normally, probably requires altering base agent
- when cliUser (satoshi) wants to use a command, terminal will call the tool with the command, then reply back to Satoshi with the output of the tool plus its own crazy insights, with real functionality
- when it comes to creating these tools, we basically grab the features and convert them into tools
- but what about sub tools like the twitter environment one? i think that can be displayed in a specific way, so every main feature tool is its own tool. since twitter is the main tool with sub commands, then all the sub commands would be called in its tool and can be a part of the description. the arguments dynamic. the arguments are then input into the actual terminal for the tool to get a result back