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
      
      input[type="text"] {
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
     <button>X</button> 
`;

    this.inputElement = shadow.querySelector('input');
    this.inputElement.addEventListener('input', ((event) => {
      console.log('input', event.target.value);
      this.dispatchEvent(new CustomEvent('change', { detail: { value: event.target.value } }));
    }));

    this.clearButton = shadow.querySelector('button');
    this.clearButton.addEventListener('click', (() => {
      this.value = '';
      this.dispatchEvent(new CustomEvent('change', { detail: { value: '' } }));
    }));
  }

  get value() {
    return this.inputElement.value;
  }

  set value(val) {
    this.inputElement.value = val;
  }
}

customElements.define('filter-search', FilterSearch);
