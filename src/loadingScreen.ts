const text: HTMLAnchorElement = document.getElementById("loading-text") as HTMLAnchorElement;
const loading_percentage_text: HTMLElement = document.getElementById("loading-percentage")!;
const canvas: HTMLElement = document.getElementById("three-canvas")!;

const name_text: string = "Tristan Bottenberg";
const load_text: string = " • • • • • • • • •";

export class loadingScreen {

    public loadPercentage: number
    private done: boolean = false;
    private animationComplete: boolean = false;
    private resolveComplete: (() => void) | null = null;

    constructor() {
        this.loadPercentage = 0;
        
        this.set_load_percentage(0);
    }

    private replace_c(text_value: string, C: string, index: number): string {
        text_value = text_value.substring(0, index) + '<a class="pacman">' + C + '</a>' + text_value.substring(index + 1, text_value.length);
        return text_value;
    }

    private set_load_percentage(func_percent: number) {
        if (func_percent >= 100 && this.done) {
            console.log(text);
            const par: HTMLParagraphElement = text.offsetParent! as HTMLParagraphElement;
            par.style.display = "none";
            canvas.style.visibility = "visible";
            console.log(canvas);
            this.animationComplete = true;
            if (this.resolveComplete) {
                this.resolveComplete();
            }
            return;
        }
        var percent = Math.min(func_percent, this.loadPercentage);
        var progress = Math.ceil(38 * (percent / 100)); 
        var C = progress % 2 == 0 ? "C" : "c";
        progress = Math.ceil(progress / 2);
        var name = name_text.substring(0, progress - 1);
        var load = load_text.substring(progress - 1, load_text.length);
        var text_value =  " " + name + load + " ";
        if (progress != 19) {
            text_value = this.replace_c(text_value, C, progress);
        }
        text.innerHTML = text_value;
        loading_percentage_text.innerHTML = String(percent).padStart(3, ' ') + "%";
        setTimeout(() => {
            console.log("timeout triggered");
            this.set_load_percentage(func_percent+1);
        }, 25);
    }

    public async set_done(): Promise<void> {
        this.done = true;
        
        // If animation is already complete, resolve immediately
        if (this.animationComplete) {
            return Promise.resolve();
        }
        
        // Otherwise, wait for animation to complete
        return new Promise<void>((resolve) => {
            this.resolveComplete = resolve;
        });
    }
}
