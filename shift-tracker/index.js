function diffMinutes(time1, time2) {
    const [h1, m1] = time1.split(":").map(Number);
    const [h2, m2] = time2.split(":").map(Number);

    const t1 = h1 * 60 + m1;
    const t2 = h2 * 60 + m2;

    let diff = t2 - t1;

    // Handle overnight (e.g. 23:00 → 02:00)
    if (diff < 0) diff += 24 * 60;

    return diff;
}





const RATE = document.querySelector('#rate')
const PERIOD = document.querySelector('#period')
const SHIFTS = document.querySelector('#shifts')
const PAY = document.querySelector('#pay')
const NEW_SHIFT = document.querySelector('#new-shift')
const DATE = document.querySelector('#new-shift #date')
const FROM_TIME = document.querySelector('#new-shift #from_time')
const TO_TIME = document.querySelector('#new-shift #to_time')
const SUBMIT = document.querySelector('#new-shift #submit')
const SHIFT_TOGGLE = document.querySelector('#shift-toggle')


let DATA = JSON.parse(localStorage.getItem('shifts'))
if (DATA == null) {
    DATA = {
        shifts: {}
    }
}
RATE.value = localStorage.getItem('rate')
DATE.value = localStorage.getItem('date')
FROM_TIME.value = localStorage.getItem('from')
TO_TIME.value = localStorage.getItem('to')



function GeneratePeriod() {
    const d = new Date(DATE.value)
    let year = d.getFullYear()
    let month = d.getMonth() + 1 // 1 is added to counter that the function starts the months at 0
    let day = d.getDate()

    let from_month = month
    let to_month = month
    let from_year = year
    let to_year = year
    if (day >= 21) {
        to_month += 1
        if (to_month > 12) {
            to_month = 1
            to_year += 1
        }
    } else if (day < 21) {
        from_month -= 1
        if (from_month < 1) {
            from_month = 12
            from_year -= 1
        }
    }
    period = `21/${from_month}/${from_year} - 21/${to_month}/${to_year}`
    return period
}

function CreateShift() {
    /*if (period in DATA.shifts) {
        Object.keys(DATA.shifts[period]).forEach((key) => {
            shift = DATA.shifts[period][key]
            let nse = document.createElement('li') // nse stands for new_shift_element
            nse.innerText = `${shift.time}, ${shift.date} | Paid: ${shift.pay}`
        })
    }*/

    let period = GeneratePeriod()

    if (!(period in DATA.shifts)) {
        DATA.shifts[period] = [{
            time: `${FROM_TIME.value} - ${TO_TIME.value}`,
            date: `${DATE.value}`,
            pay: (RATE.value / 60) * diffMinutes(FROM_TIME.value, TO_TIME.value)
        }]
    }
    else {
        DATA.shifts[period].push({
            time: `${FROM_TIME.value} - ${TO_TIME.value}`,
            date: `${DATE.value}`,
            pay: (RATE.value / 60) * diffMinutes(FROM_TIME.value, TO_TIME.value)
        })
   }
}

function RefreshPeriods() {
    PERIOD.innerHTML = ''

    Object.keys(DATA.shifts).forEach((key) => {
        let ne = document.createElement('option')
        ne.textContent = key
        ne.value = key
        PERIOD.appendChild(ne)
    })
}

function RefreshShifts() {
    SHIFTS.innerHTML = ''

    let total_pay = 0

    const period = PERIOD.value
    Object.keys(DATA.shifts[period]).forEach((key) => {
        shift = DATA.shifts[period][key]
        let ne = document.createElement('li')
        ne.textContent = `${shift.date} ${shift.time} | Paid: ${shift.pay} DKK. `
        let nae = document.createElement('a')
        nae.href = `javascript:DeleteShift('${period}', '${key}')`
        nae.textContent = 'Delete'
        ne.appendChild(nae)
        SHIFTS.appendChild(ne)
        total_pay += shift.pay
    })

    PAY.innerText = total_pay
}

function DeleteShift(period, shift_key) {
    DATA.shifts[period].splice(shift_key, 1)
    SaveData()
    RefreshShifts()
    if (DATA.shifts[period].length == 0) {
        delete DATA.shifts[period]
        SaveData()
        RefreshPeriods()
        RefreshShifts()
    }
}

function SaveData() {
    localStorage.setItem('shifts', JSON.stringify(DATA))
    localStorage.setItem('rate', RATE.value)
    localStorage.setItem('date', DATE.value)
    localStorage.setItem('from', FROM_TIME.value)
    localStorage.setItem('to', TO_TIME.value)
}

function UpdateShiftToggle() {
    if (!FROM_TIME.value || (FROM_TIME.value && TO_TIME.value)) {
        SHIFT_TOGGLE.innerText = 'Start shift'
    } else {
        SHIFT_TOGGLE.innerText = 'Stop shift'
    }
}



NEW_SHIFT.addEventListener('submit', (event) => {
    event.preventDefault()

    CreateShift()
    RefreshPeriods()
    RefreshShifts()

    SaveData()
})

PERIOD.addEventListener('change', () => {
    RefreshShifts()
})

RATE.addEventListener('change', () => {
    SaveData()
})
DATE.addEventListener('change', () => {
    SaveData()
})
FROM_TIME.addEventListener('change', () => {
    SaveData()
    UpdateShiftToggle()
})
TO_TIME.addEventListener('change', () => {
    SaveData()
    UpdateShiftToggle()
})

SHIFT_TOGGLE.addEventListener('click', () => {
    const now = new Date()
    if (!FROM_TIME.value || (FROM_TIME.value && TO_TIME.value)) {
        DATE.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
        FROM_TIME.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        TO_TIME.value = ''
        DATE.dispatchEvent(new Event('change'))
        FROM_TIME.dispatchEvent(new Event('change'))
        TO_TIME.dispatchEvent(new Event('change'))
    } else {
        TO_TIME.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        TO_TIME.dispatchEvent(new Event('change'))
        NEW_SHIFT.requestSubmit()
    }
    UpdateShiftToggle()
})

RefreshPeriods()
RefreshShifts()
UpdateShiftToggle()



const cdetails = document.querySelectorAll('cdetails')
const cdetails_array = Array.from(cdetails)
const cdetailsObserver = new MutationObserver((mutations) => {
    mutations.some((m) => {
        const root = cdetails_array.find((r) => r.contains(m.target))
        if (root) {
            root.style.setProperty('--content-height', root.querySelector('content').scrollHeight + "px")
            return true
        }
    })
})
cdetails.forEach((e) => {
    e.querySelector('summary').addEventListener('click', () => {
        e.toggleAttribute('open')
    })
    cdetailsObserver.observe(e, {
        childList: true,
        subtree: true
    })
    e.style.setProperty('--content-height', e.querySelector('content').scrollHeight + "px")
})