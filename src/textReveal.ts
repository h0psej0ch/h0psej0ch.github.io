export class textReveal {
    private revealed: boolean = false;
    private element: HTMLElement;
    private timeouts: NodeJS.Timeout[];

    constructor(el: HTMLElement) {
        this.element = el;
        this.timeouts = [];
    }

    public revealText(text: string, delay: number = 50): void {

        console.log(delay)
        
        this.element.textContent = '';
        if (!this.revealed) {
            this.revealed = true;
            for (let i: number = 0; i < text.length; i++) {
                this.timeouts.push(setTimeout(() => {
                    console.log(i * delay)
                    if (this.revealed) {
                        this.element.textContent = text.substring(0, i+1);
                    }
                }, delay * i));
            }
        }
    }

    public hideText(): void {
        this.revealed = false;
        this.element.textContent = '';
        this.timeouts.forEach(tm => {
            clearTimeout(tm);
        });
    }
}


