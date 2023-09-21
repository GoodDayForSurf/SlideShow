
const serverUrl = 'http://localhost:9999/';
let delay = 5;
const appearanceDelay = 1;
const players = {
    image: null,
    video: null,
};
const imgHelper = new Image();

let FOTOS = [];

let currentIndex = 0;
let isCurrentShowImage = true;
let nextDelayTimeout;
let isPaused = false;

function onLoadImg() {
    players.image.className = isPaused ? 'appearance' : 'appearance-and-hiding';
    players.image.style.backgroundImage = `url(${imgHelper.src})`;

    if( isPaused ) { return; }

    nextDelayTimeout = setTimeout(() => {
        showNext();
    }, delay * 1000);
}

imgHelper.onload = async function() {


    setTimeout(() => onLoadImg(), 50);
}

document.addEventListener("DOMContentLoaded", function() {
    document.querySelector("#choose-files-input").addEventListener("change", function() {
        const files = this.files;

        document.body.style.setProperty('--appearance-delay', appearanceDelay + 's' );

        FOTOS = [...files].flatMap(f => {
            const isVideo = f.type.startsWith("video/mp4");
            const isFileForShow = isVideo || f.type.startsWith("image/");
            return isFileForShow ? [URL.createObjectURL(f) + (isVideo ? '\u00A0video=true': '')] : [];
        });

        init();
    });
});

function enablePlayer(player) {
    isCurrentShowImage = player !== players.video;

    if(isCurrentShowImage) {
        players.video.pause();
        players.video.blur();
        document.body.focus();
    }

    players.image.className = isCurrentShowImage ? '' : 'disabled';
    players.video.className = isCurrentShowImage ? 'disabled' : '';
}


function showNext() {
    let [src, isVideo] = FOTOS[currentIndex].split('\u00A0');

    isVideo = isVideo || /mp4$/i.test(src);

   if ( isVideo ) {
        enablePlayer(players.video);
        players.video.src = src;
        players.video.load();
        players.video.focus();
    } else {
       enablePlayer(players.image)
       players.image.style.backgroundImage = 'none';
       players.image.className = '';
       imgHelper.src = src;
    }

    currentIndex += 1;

    if (FOTOS.length === currentIndex) {
        currentIndex = 0;
    }
}

async function initFromServer() {
    const html =  await fetch(serverUrl);
    const text = await html.text();

    const tmpEl = document.createElement('div');
    document.body.appendChild(tmpEl);
    tmpEl.innerHTML = text;

    FOTOS = [...document.querySelectorAll('a')].flatMap( (el) => {
        const href =  el.getAttribute('href');

        return /\.[\d\w]{2,4}$/i.test(href) ? [serverUrl + href] : [];
    });

    tmpEl.remove();
}

async function init(useServer = false) {
    await (useServer ? initFromServer() : null);

    document.querySelector('#start-panel').style.display = 'none';
    document.querySelector('#canvas').className = 'enabled';

    players.video = document.querySelector('#video-player');
    players.image = document.querySelector('#img-player');

    players.video.addEventListener("loadedmetadata", function() {
        const videoWidth = this.videoWidth;
        const videoHeight = this.videoHeight;

        if (videoWidth > videoHeight) {
            players.video.style.width = "100%";
        } else {
            players.video.style.height = "100%";
        }
    });

    players.video.addEventListener('ended', function() {
        showNext();
    });

    addKeyboardControls();

    showNext();
    changeDelay(0);
}

function changeDelay(diff) {
    delay += (delay + diff <= appearanceDelay * 2 ? 0 : diff);
    const infoEl = document.querySelector('#info-container');

    document.body.style.setProperty('--showing-time', delay + 's' );

    infoEl.innerHTML = `Delay is ${delay} s`;
    infoEl.className = 'active';

    clearTimeout(changeDelay.timeout);
    changeDelay.timeout = setTimeout(() => {
        infoEl.className = '';
    }, 2000);
}

function getImageSize() {

}

function addKeyboardControls() {
    document.body.addEventListener("keydown", function(event) {

        switch (event.code) {
            case "ArrowLeft":
                clearTimeout(nextDelayTimeout);
                currentIndex = currentIndex > 1 ? currentIndex - 2 : 0;
                showNext();
                break;
            case "ArrowRight":
                clearTimeout(nextDelayTimeout);
                showNext();
                break;
            case "NumpadSubtract":
            case "Minus":
                changeDelay(-1);
                break;
            case "NumpadAdd":
            case "equal":
                changeDelay(1);
                break;
            case "Space":
                isPaused = !isPaused;
                clearTimeout(nextDelayTimeout);

                document.querySelector('#pause-icon').style.display = isPaused ? 'block' : 'none';

                players.image.className = '';

                if(!isPaused) {
                    players.image.className = 'hiding';

                    setTimeout(() => {
                        players.image.style.backgroundImage = 'none';
                        players.image.className = '';
                        showNext();
                    }, appearanceDelay * 1000)
                }

                event.preventDefault();
                break;
        }
    });
}

