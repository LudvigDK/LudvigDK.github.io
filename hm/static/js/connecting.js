const connect_button = document.getElementById("connect_button")

connect_button.addEventListener("click", function() {
    var connecting_text = document.createElement("div")
    connecting_text.id = "connecting_text"
    connecting_text.innerHTML = "<h1>Connecting to server, please wait</h1><h2>This may take several minutes</h2>"

    var hack_script = document.createElement("script")
    //hack_script.src = "static/js/hack.js"
    hack_script.src = "to_run.js"

    document.getElementById("tab_title").innerText = "Connecting"

    document.body.appendChild(connecting_text)
    document.body.appendChild(hack_script)

    connect_button.remove()
})
