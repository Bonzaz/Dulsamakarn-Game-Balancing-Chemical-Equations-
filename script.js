// Retrieve the number of equations to generate from the URL
const urlParams = new URLSearchParams(window.location.search);
const equationCount = parseInt(urlParams.get('count')) || 5;

let equations = [];
let currentEquationIndex = 0;
let score = 0;
let missed = 0;

const equationDisplay = document.getElementById('equation-display');
const feedbackDisplay = document.getElementById('feedback');
const checkBtn = document.getElementById('check-btn');
const nextBtn = document.getElementById('next-btn');
const scoreDisplay = document.getElementById('score');

// --- Procedural Generation Logic ---

function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generates a hydrocarbon combustion reaction: CxHy + O2 -> CO2 + H2O
function generateCombustion() {
    const C = getRandomInt(1, 8);
    // Ensure H is even to simplify O2 balancing logic slightly, though general case handles it
    // Alkanes: 2n+2, Alkenes: 2n, Alkynes: 2n-2
    const type = getRandomInt(0, 2);
    let H;
    if (type === 0) H = 2 * C + 2; // Alkane
    else if (type === 1) H = 2 * C; // Alkene
    else H = Math.max(2, 2 * C - 2); // Alkyne

    // Balancing:
    // CxHy + (x + y/4) O2 -> x CO2 + (y/2) H2O
    // We need to ensure coefficients are integers.
    // Let k = x + y/4. If k is not integer, multiply all coefficients by 4 (worst case) or 2.
    
    // Simplification:
    // O2 coeff = (4x + y) / 4
    // CO2 coeff = x
    // H2O coeff = y / 2
    
    // To clear the denominator 4 from O2, we check if (4x + y) is divisible by 4.
    // Actually, since O is diatomic (O2), we balance O atoms.
    // RHS O atoms = 2*x + (y/2).
    // LHS O atoms = 2 * (O2 coeff).
    // So 2 * (O2 coeff) = 2x + y/2 => O2 coeff = x + y/4.
    
    let fuelCoeff = 1;
    let o2Coeff = (4 * C + H) / 4;
    let co2Coeff = C;
    let h2oCoeff = H / 2;

    // Make integers
    if (!Number.isInteger(o2Coeff)) {
        // If .5, multiply by 2. If .25 or .75, multiply by 4.
        if ((o2Coeff * 2) % 1 === 0) {
            fuelCoeff *= 2;
            o2Coeff *= 2;
            co2Coeff *= 2;
            h2oCoeff *= 2;
        } else {
            fuelCoeff *= 4;
            o2Coeff *= 4;
            co2Coeff *= 4;
            h2oCoeff *= 4;
        }
    }
    
    // Simplify if possible (e.g. 2 4 2 4 -> 1 2 1 2)
    const divisor = gcd(fuelCoeff, gcd(o2Coeff, gcd(co2Coeff, h2oCoeff)));
    
    return {
        parts: [
            { type: 'molecule', formula: `C${C > 1 ? C : ''}H${H}`, coefficient: fuelCoeff / divisor },
            { type: 'operator', text: '+' },
            { type: 'molecule', formula: 'O2', coefficient: o2Coeff / divisor },
            { type: 'operator', text: '→' },
            { type: 'molecule', formula: 'CO2', coefficient: co2Coeff / divisor },
            { type: 'operator', text: '+' },
            { type: 'molecule', formula: 'H2O', coefficient: h2oCoeff / divisor }
        ]
    };
}

// Generates a Synthesis reaction: A + B -> AxBy
function generateSynthesis() {
    // Common elements with predictable valencies for this level
    const metals = [
        { sym: 'Na', val: 1 }, { sym: 'K', val: 1 }, { sym: 'Li', val: 1 },
        { sym: 'Mg', val: 2 }, { sym: 'Ca', val: 2 }, { sym: 'Ba', val: 2 },
        { sym: 'Al', val: 3 }, { sym: 'Fe', val: 3 }, // Fe can be 2, but 3 is common for Fe2O3
        { sym: 'Zn', val: 2 }, { sym: 'Ag', val: 1 }
    ];
    
    const nonMetals = [
        { sym: 'O', val: 2, diatomic: true },
        { sym: 'Cl', val: 1, diatomic: true },
        { sym: 'N', val: 3, diatomic: true },
        { sym: 'S', val: 2, diatomic: false }, // S8 is real but usually just S in simple eq
        { sym: 'F', val: 1, diatomic: true },
        { sym: 'Br', val: 1, diatomic: true } // Liquid but handled as gas/diatomic in eq
    ];

    const metal = metals[getRandomInt(0, metals.length - 1)];
    const nonMetal = nonMetals[getRandomInt(0, nonMetals.length - 1)];

    // Product formula: M_x NM_y
    // Swap valencies: M gets val(NM), NM gets val(M)
    // Simplify subscript
    let subM = nonMetal.val;
    let subNM = metal.val;
    const commonDiv = gcd(subM, subNM);
    subM /= commonDiv;
    subNM /= commonDiv;

    let productFormula = metal.sym;
    if (subM > 1) productFormula += subM;
    productFormula += nonMetal.sym;
    if (subNM > 1) productFormula += subNM;

    // Reactants
    const metalFormula = metal.sym; // Metals are monatomic in simple equations
    const nonMetalFormula = nonMetal.diatomic ? `${nonMetal.sym}2` : nonMetal.sym;
    
    // Balancing
    // a M + b NM(2?) -> c (M_subM NM_subNM)
    // Balance Non-Metal first
    // RHS NM atoms = c * subNM
    // LHS NM atoms = b * (isDiatomic ? 2 : 1)
    
    // Let's brute force valid small integers or use LCM
    // Target NM atoms = LCM(subNM, diatomic?2:1)
    const nmSource = nonMetal.diatomic ? 2 : 1;
    const targetNM = (subNM * nmSource) / gcd(subNM, nmSource); // LCM
    
    let productCoeff = targetNM / subNM;
    let nonMetalCoeff = targetNM / nmSource;
    
    // Now balance Metal
    // RHS Metal atoms = productCoeff * subM
    // LHS Metal atoms = metalCoeff * 1
    let metalCoeff = productCoeff * subM;
    
    // Simplify
    const divisor = gcd(metalCoeff, gcd(nonMetalCoeff, productCoeff));

    return {
        parts: [
            { type: 'molecule', formula: metalFormula, coefficient: metalCoeff / divisor },
            { type: 'operator', text: '+' },
            { type: 'molecule', formula: nonMetalFormula, coefficient: nonMetalCoeff / divisor },
            { type: 'operator', text: '→' },
            { type: 'molecule', formula: productFormula, coefficient: productCoeff / divisor }
        ]
    };
}

function generateEquations(count) {
    const generated = [];
    for (let i = 0; i < count; i++) {
        // Randomly choose between Combustion (40%) and Synthesis (60%)
        if (Math.random() < 0.4) {
            generated.push(generateCombustion());
        } else {
            generated.push(generateSynthesis());
        }
    }
    return generated;
}

// --- Game Logic (Existing adapted) ---

equations = generateEquations(equationCount);

function formatFormula(formula) {
    return formula.replace(/(\d+)/g, '<span class="subscript">$1</span>');
}

function loadEquation() {
    if (currentEquationIndex >= equations.length) {
        showSummary();
        return;
    }

    const eq = equations[currentEquationIndex];
    equationDisplay.innerHTML = '';
    feedbackDisplay.textContent = '';
    feedbackDisplay.className = 'feedback';
    nextBtn.classList.add('hidden');
    checkBtn.classList.add('hidden');

    eq.parts.forEach((part, index) => {
        if (part.type === 'molecule') {
            const wrapper = document.createElement('div');
            wrapper.className = 'molecule-wrapper';
            
            const input = document.createElement('input');
            input.type = 'number';
            input.min = '1';
            input.dataset.index = index;
            input.placeholder = '?';
            input.addEventListener('input', checkAllInputsFilled);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !checkBtn.classList.contains('hidden')) {
                    checkAnswer();
                }
            });
            
            const span = document.createElement('span');
            span.innerHTML = formatFormula(part.formula);
            
            wrapper.appendChild(input);
            wrapper.appendChild(span);
            equationDisplay.appendChild(wrapper);
        } else {
            const span = document.createElement('span');
            span.className = 'operator';
            span.textContent = part.text;
            equationDisplay.appendChild(span);
        }
    });
    
    // Focus first input
    setTimeout(() => {
        const firstInput = equationDisplay.querySelector('input');
        if(firstInput) firstInput.focus();
    }, 100);
}

function checkAllInputsFilled() {
    const inputs = equationDisplay.querySelectorAll('input');
    const allFilled = Array.from(inputs).every(input => input.value !== '');
    if (allFilled) {
        checkBtn.classList.remove('hidden');
    } else {
        checkBtn.classList.add('hidden');
    }
}

function checkAnswer() {
    const eq = equations[currentEquationIndex];
    const inputs = equationDisplay.querySelectorAll('input');
    let isCorrect = true;

    inputs.forEach(input => {
        const partIndex = parseInt(input.dataset.index);
        const correctValue = eq.parts[partIndex].coefficient;
        if (parseInt(input.value) !== correctValue) {
            isCorrect = false;
        }
    });

    inputs.forEach(input => input.disabled = true);
        
    checkBtn.classList.add('hidden');
    nextBtn.classList.remove('hidden');
    nextBtn.focus();

    if (isCorrect) {
        feedbackDisplay.textContent = 'ถูกต้อง! เก่งมากค้าบบ';
        feedbackDisplay.className = 'feedback correct';
        score++;
        scoreDisplay.textContent = score;
    } else {
        feedbackDisplay.textContent = 'แง ยังไม่ถูกน้า';
        feedbackDisplay.className = 'feedback incorrect';
        missed++;
    }
}

function nextEquation() {
    currentEquationIndex++;
    loadEquation();
}

function showSummary() {
    const mainHeader = document.querySelector(".container h1");
    equationDisplay.innerHTML = `
        <div class="summary">
            <h2>จบเกม!</h2>
            <p>จาก ${equations.length} ข้อ</p>
            <p>คุณทำถูก: ${score}</p>
            <p>คุณทำผิด: ${missed}</p>
            <button onclick="window.location.href='index.html'" class="restart-btn">เล่นอีกครั้ง</button>
        </div>
    `;
    mainHeader.style.display = 'none';
    checkBtn.classList.add('hidden');
    nextBtn.classList.add('hidden');
    feedbackDisplay.textContent = '';
}

checkBtn.addEventListener('click', checkAnswer);
nextBtn.addEventListener('click', nextEquation);

// Initial load
loadEquation();
