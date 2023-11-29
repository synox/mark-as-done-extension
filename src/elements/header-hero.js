class HeaderHero extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
    <style>
      :host {
        display: flex;
         align-items: center;
      }
      
      h1 {
        font-weight: 200;
        font-size: 30px;
        margin-bottom: 0;
        margin-top: 0;
      }
      
      .logo {
        height: 40px;
      }
    </style>

    <img class="logo" src="../../images/icon-none.png" alt="logo">
    <h1>Reading List</h1>`;
  }
}

customElements.define('header-hero', HeaderHero);
