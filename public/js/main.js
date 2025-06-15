let messages = [
        "Bienvenido 😎",
        "Logueate para ver más 🎆",
        "Que te diviertas en esta mini red social 🎉"
];
let colors = [
        "red",
        "blue",
        "orange"
    ];
let i = 0;
mensaje = document.getElementById("message");
setInterval(() => {
    mensaje.innerText = messages[i];
    mensaje.style.color = colors[i];
    // Forma 1
    // if (i > message.length - 1) {
    //     i = 0; // Reset index to loop through messages
    // }

    // Forma 2
    i = (i + 1) % messages.length;
}, 2000)