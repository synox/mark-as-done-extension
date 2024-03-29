class FilterSearch extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
    <style>
      :host {
        display: flex;
        align-items: center;
        position: relative;
      }
      
      img {
        position: absolute;
        height: 1.5rem;
        left: 5px;
        filter: opacity(0.5);
      }
      
      @media only screen and (prefers-color-scheme: dark) {
          img {
            filter: invert(1);
          }
      }
      
      input[type="text"] {
        width: 100%;
        height: 2rem;
        padding-left: 2rem;
        padding-right: 25px;
      }
      
      button {
        position: absolute;
        right: 0;
        width: 30px;
        background: none;
        border: none;
        padding: 10px;
        text-align: center;
        cursor: pointer;
      }
    </style>
    <img src="../../images/magnifying-glass.svg" alt="search" />
    <input type="text" placeholder="search..." />   
    <button style="visibility: hidden">X</button> 
    `;

    this.inputElement = shadow.querySelector('input');
    this.inputElement.addEventListener('input', ((event) => {
      this.value = event.target.value;
      this.dispatchEvent(new CustomEvent('change', { detail: { value: event.target.value } }));
      this.updateClearButton();
    }));

    this.clearButton = shadow.querySelector('button');
    this.clearButton.addEventListener('click', (() => {
      this.value = '';
      this.dispatchEvent(new CustomEvent('change', { detail: { value: '' } }));
      this.updateClearButton();
    }));
  }

  updateClearButton() {
    if (this.value.length > 0) {
      this.clearButton.style.visibility = 'visible';
    } else {
      this.clearButton.style.visibility = 'hidden';
    }
  }

  get value() {
    return this.inputElement.value;
  }

  set value(val) {
    this.inputElement.value = val;
    this.setAttribute('value', val);
  }
}

customElements.define('filter-search', FilterSearch);
