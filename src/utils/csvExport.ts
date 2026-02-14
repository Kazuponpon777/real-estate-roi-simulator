import type { SimulationData } from "../stores/useSimulationStore";

export const generateCSV = (data: SimulationData): string => {
    const rows: string[][] = [];

    // Helper to add a row
    const addRow = (category: string, item: string, value: string | number, unit: string = '') => {
        rows.push([category, item, String(value), unit]);
    };

    // Headers
    rows.push(['Category', 'Item', 'Value', 'Unit']);

    // Property
    addRow('Property', 'Mode', data.mode);
    addRow('Property', 'Land Area (M2)', data.property.landAreaM2, 'm2');
    addRow('Property', 'Bulding Structure', data.property.structure);

    // Budget
    addRow('Budget', 'Land Price', data.budget.landPrice, 'Man-yen');
    addRow('Budget', 'Construction Cost', data.budget.buildingWorksCost, 'Man-yen');
    addRow('Budget', 'Total Initial Cost',
        data.budget.landPrice + data.budget.buildingWorksCost + data.budget.otherInitialCost + data.budget.brokerageFee,
        'Man-yen');

    // Funding
    const totalLoans = data.funding.loans.reduce((acc, l) => acc + l.amount, 0);
    addRow('Funding', 'Own Capital', data.funding.ownCapital, 'Man-yen');
    addRow('Funding', 'Total Loans', totalLoans, 'Man-yen');
    data.funding.loans.forEach((loan, i) => {
        addRow('Funding', `Loan ${i + 1} Name`, loan.name);
        addRow('Funding', `Loan ${i + 1} Amount`, loan.amount, 'Man-yen');
        addRow('Funding', `Loan ${i + 1} Rate`, loan.rate, '%');
        addRow('Funding', `Loan ${i + 1} Duration`, loan.duration, 'Years');
    });

    // Rent Roll
    data.rentRoll.roomTypes.forEach((room, i) => {
        addRow('RentRoll', `Room ${i + 1} Name`, room.name);
        addRow('RentRoll', `Room ${i + 1} Count`, room.count, 'Units');
        addRow('RentRoll', `Room ${i + 1} Rent`, room.rent, 'Yen');
    });
    addRow('RentRoll', 'Occupancy Rate', data.rentRoll.occupancyRate, '%');

    // Expenses
    addRow('Expenses', 'Management Fee Mode', data.expenses.managementFeeMode);
    if (data.expenses.managementFeeMode === 'ratio') {
        addRow('Expenses', 'Management Fee Ratio', data.expenses.managementFeeRatio, '%');
    } else {
        addRow('Expenses', 'Management Fee Fixed', data.expenses.managementFeeFixed, 'Yen');
    }

    // Convert to CSV string
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
};

export const downloadCSV = (data: SimulationData) => {
    const csvContent = generateCSV(data);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `simulation_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
