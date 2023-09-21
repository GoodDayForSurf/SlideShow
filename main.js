
const serverUrl = 'http://localhost:9999/';
let delay = 12;
const players = {
    image: null,
    video: null,
};
let FOTOS = [];

let currentIndex = 0;
let isCurrentShowImage = true;
let nextDelayTimeout;
let isPaused = false;

const bodyHtml = `
                           <img id="img-player" src="">
                            <video id="video-player" controls autoplay width="100%">
                                <source id="video-source" src="" type="video/mp4">
                                Ваш браузер не поддерживает видео.
                            </video>
                            <div id="pause-icon">⏸</div>
                            <div id="info-container"></div>
`;

document.addEventListener("DOMContentLoaded", function() {
    document.querySelector("#choose-files-input").addEventListener("change", function() {
        const files = this.files;

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

function showNext(ignorePause = false) {
    let [src, isVideo] = FOTOS[currentIndex].split('\u00A0');
    isVideo = isVideo || /mp4$/i.test(src);

    if ( isPaused && !ignorePause ) {
        return setTimeout(() => {
            showNext();
        }, 100);
    }

    if ( isVideo ) {
        enablePlayer(players.video);
        players.video.src = src;
        players.video.load();
        players.video.focus();
    } else {
        enablePlayer(players.image);
        players.image.src = src;

        setTimeout(() => {
            players.image.className = 'visible';
        }, 50);
    }

    currentIndex += 1;

    if (FOTOS.length === currentIndex) {
        currentIndex = 0;
    }
}

async function initFromServer() {
    const html =  await fetch(serverUrl);
    const text = await html.text();

    document.body.innerHTML = text;

    FOTOS = [...document.querySelectorAll('a')].flatMap( (el) => {
        const href =  el.getAttribute('href');

        return /\.[\d\w]{2,4}$/i.test(href) ? [serverUrl + href] : [];
    });
}

async function init(useServer = false) {
    await (useServer ? initFromServer() : null);

    document.body.innerHTML = bodyHtml;

    players.video = document.querySelector('#video-player');
    players.image = document.querySelector('#img-player');

    players.image.addEventListener('load', function() {
        if( isPaused ) { return; }

        nextDelayTimeout = setTimeout(() => {
            showNext();
        }, delay * 1000)
    });

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
    delay += delay == 1 && diff < 1 ? 0 : diff;
    const infoEl = document.querySelector('#info-container');

    infoEl.innerHTML = `Delay is ${delay} s`;
    infoEl.className = 'active';

    clearTimeout(changeDelay.timeout);
    changeDelay.timeout = setTimeout(() => {
        infoEl.className = '';
    }, 2000);
}

function addKeyboardControls() {
    document.body.addEventListener("keydown", function(event) {

        switch (event.code) {
            case "ArrowLeft":
                clearTimeout(nextDelayTimeout);
                currentIndex = currentIndex > 1 ? currentIndex - 2 : 0;
                showNext(true);
                break;
            case "ArrowRight":
                clearTimeout(nextDelayTimeout);
                showNext(true);
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
                document.querySelector('#pause-icon').style.display = isPaused ? 'block' : 'none';
                event.preventDefault();
                break;
        }
    });
}

