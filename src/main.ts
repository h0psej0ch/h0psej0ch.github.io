import { loadingScreen } from './loadingScreen.ts';
import { threeScene } from './threeScene.ts';

const UNDER_CONSTRUCTION = false; 

document.addEventListener('DOMContentLoaded', () => {
    var screen: loadingScreen = new loadingScreen();
    if (UNDER_CONSTRUCTION) {
        console.log("under construction");
        screen.loadPercentage = 69;
        var elements = document.getElementsByClassName('construction');
        for (var i = 0; i < elements.length; i++) {
            console.log(elements[i]);
            elements[i].style.display = 'block';
        }
    } else {
        new threeScene(screen);
    }
});
