module powerbi.extensibility.visual.customLink4821203B4EF54535B2D768A031A82BD0  {
    export class Visual implements IVisual {
        private target: HTMLElement;
      
        constructor(options: VisualConstructorOptions) {
          var captionArea = document.createElement("div");
          captionArea.innerHTML = "This is test chart";
          options.element.appendChild(captionArea);
          this.target = document.createElement("div");
          options.element.appendChild(this.target);
          window.open("http://www.google.fr");
          
        }
      
        public update(options: VisualUpdateOptions) {
          this.target.innerHTML =
            JSON.stringify(options.dataViews[0].metadata.columns);
        }
      
        public destroy(): void {
          //TODO: Perform any cleanup tasks here
        }

        private createHelpLinkElement(): Element {
            let linkElement = document.createElement("a");
            linkElement.textContent = "?";
            linkElement.setAttribute("title", "Open documentation");
            linkElement.setAttribute("class", "helpLink");
            linkElement.addEventListener("click", () => {
                //this.host.launchUrl("https://github.com/Microsoft/PowerBI-visuals/blob/master/Readme.md#developing-your-first-powerbi-visual");
            });
            return linkElement;
        };
      }
}