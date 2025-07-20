import { loadingScreen } from './loadingScreen.ts';
import { threeScene } from './threeScene.ts';
import { textReveal } from './textReveal.ts';

const UNDER_CONSTRUCTION = false; 

document.querySelectorAll('.link-item').forEach(linkItem => {
    const logoText = linkItem.querySelector('.logo-text') as HTMLElement;
    const originalText = logoText.textContent || '';

    let textElement = linkItem.childNodes[3] as HTMLElement
    let tr = new textReveal(textElement as HTMLElement);
    
    linkItem.addEventListener('mouseenter', () => {
        tr.revealText(textElement.id, 30);
    });
    
    linkItem.addEventListener('mouseleave', () => {
        tr.hideText();
    });
});

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
