//import Swup from 'https://unpkg.com/swup@4?module';

//const swup = new Swup();

import * as SwupModule from "https://unpkg.com/swup@4?Module";
console.log(SwupModule);

import {MoveCursor}  from './custom_cursor.js';

window.swup = swup;

import * as m from './menu_bar.js';
import { initialize } from './draggable.js';
import * as t from './transition_page.js';
import * as d from './desktopHandler.js';
import { goFullScreen } from './fullScreen.js';

let maxWidth = 75; 
let minWidth = 0;
let maxHeight = 60;
let minHeight = 5;
let stepHeight = 10;  
let stepWidth = 8;
let offSetX = 7;
let offSetY = 10;
let width = '50%';
let height = '50%';

let fullScreen = false;
fullScreen = localStorage.getItem('fullScreen') === 'true';

if (fullScreen) {
    maxWidth = 90;
    minWidth = 0;
    maxHeight = 80;
    minHeight = 10;
    stepHeight = 10;
    stepWidth = 8;
    offSetX = 0;
    offSetY = 0;
}

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

setInterval(() => {
  d.updateDateTime(isMobile);
}, 1000);

if(isMobile){
    fullScreen = true;
    localStorage.setItem('fullScreen', fullScreen);
    if (fullScreen) {
        maxWidth = 80;
        minWidth = 0;
        maxHeight = 70;
        minHeight = 10;
        stepHeight = 10;  
        stepWidth = 20;
        offSetX = 0;
        offSetY = 0;
    }
    else{
        maxWidth = 70; 
        minWidth = 5;
        maxHeight = 60;
        minHeight = 10;
        stepHeight = 10;  
        stepWidth = 20;
        offSetX = 7;
        offSetY = 10;
    }


}

document.addEventListener('click', (event) => {
    if (event.target.closest('.source_button') ) {

        event.preventDefault(); // Empêche l'action par défaut

        fullScreen = !fullScreen;

        localStorage.setItem('fullScreen', fullScreen);

        window.location.href = 'index.php';
    }
});


window.addEventListener('load', () => {
    let fullScreen = localStorage.getItem('fullScreen') === 'true';

    if (fullScreen) {
        console.log("Mode plein écran desactivé");

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                console.log("Touche Échap pressée, retour à l'index");

                localStorage.setItem('fullScreen', false);

                window.location.href = 'index.php';
            }
        });
    }
});

function init(minHeight, minWidth, maxHeight, maxWidth, stepHeight, stepWidth, offSetX, offSetY) {

    const fullScreen2 = localStorage.getItem('fullScreen') === 'true';

    if (fullScreen2) {
        goFullScreen(minWidth, minHeight, maxWidth, maxHeight, stepWidth, stepHeight);
    }
    MoveCursor();
    delay(1000).then(() => {


        d.generateDesktopMenu(width, height, isMobile).then(() => {
            initialize(minHeight, minWidth, maxHeight, maxWidth, stepHeight, stepWidth, offSetX, offSetY,isMobile); 
        });
    });
}

//document.addEventListener('swup:animation-out-start', () => t.transition_start);
//document.addEventListener('swup:animation-in-end', () => t.transition_end);


document.addEventListener('DOMContentLoaded', () => {
    
    init(minHeight, minWidth, maxHeight, maxWidth, stepHeight, stepWidth, offSetX, offSetY);
    m.tab(offSetX, offSetY, width, height, isMobile); 
});


/*if (swup?.hooks?.on) {
    swup.hooks.on('page:view', () => {
        init(minHeight, minWidth, maxHeight, maxWidth, stepHeight, stepWidth, offSetX, offSetY);
    }

    );
}  */

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}
