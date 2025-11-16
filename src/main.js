/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, product) {
    const {sale_price, quantity, discount} = purchase;

    const discountMultiplier = 1 - discount / 100;
    return sale_price * quantity * discountMultiplier;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const {profit} = seller;

    if (index === 0) {
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        return profit * 0.1;
    } else if (index === total - 1) {
        return 0;
    } else {
        return profit * 0.05;
    }
}

function calculateSimpleProfit(purchase, _product) {
    const {discount, sale_price, quantity = 0} = purchase;

    return (
        sale_price * (1 - discount / 100) * quantity -
        _product.purchase_price * quantity
    );
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {

    if (
        !data
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.purchase_records)
    ) {
        throw new Error("Некорректные входные данные");
    }

    const {calculateSimpleRevenue, calculateBonusByProfit, calculateSimpleProfit} = options;

    const itemIndex = Object.fromEntries(
        data.products.map(item => [item.sku, item])
    );

    const sellerStat = Object.fromEntries(
        data.sellers.map(seller => [
            seller.id,
            {
                id: seller.id,
                name: `${seller.first_name} ${seller.last_name}`,
                revenue: 0,
                profit: 0,
                sales_count: 0,
                products_sold: {}
            }
        ])
    );

    for (let rec of data.purchase_records) {
        const {seller_id} = rec;
        const stat = sellerStat[seller_id];

        stat.sales_count++;

        for (let item of rec.items) {
            const {sku, quantity, discount, sale_price} = item;

            const product = itemIndex[sku];

            stat.products_sold[sku] = (stat.products_sold[sku] ?? 0) + quantity;

            stat.revenue += calculateSimpleRevenue(item, product);

            stat.profit += calculateSimpleProfit(item, product);
        }
    }

    const sellerStatSorted = Object.values(sellerStat)
        .sort((a, b) => b.profit - a.profit);


    sellerStatSorted.forEach((seller, index) => {
        seller.bonus = calculateBonusByProfit(index, sellerStatSorted.length, seller);

        seller.top_products = Object
            .entries(seller.products_sold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([sku, quantity]) => ({sku, quantity}));
    });

    return sellerStatSorted.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2),
    }));
}

const report = analyzeSalesData(data, {
    calculateSimpleRevenue,
    calculateBonusByProfit,
    calculateSimpleProfit
});

console.table(report);
