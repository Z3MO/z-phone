function setCalculatorErrorState(hasError) {
    var display = calc.display;

    if (!display) {
        return;
    }

    display.classList.toggle("is-error", hasError);
}

function data(val){
    setCalculatorErrorState(false);
    calc.display.value += val;
}

function ac(){
    setCalculatorErrorState(false);
    calc.display.value = "";
}

function c(){
    setCalculatorErrorState(false);
    calc.display.value = calc.display.value.slice(0, -1);
}

function equal(){
    if (!calc.display.value) {
        return;
    }

    try {
        calc.display.value = eval(calc.display.value);
        setCalculatorErrorState(false);
    } catch (error) {
        calc.display.value = "Error";
        setCalculatorErrorState(true);
    }
}