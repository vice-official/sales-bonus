function calculateSimpleRevenue(purchase, _product) {
    const { sale_price, quantity, discount } = purchase;
    const discountMultiplier = 1 - discount / 100;
    const revenue = sale_price * quantity * discountMultiplier;
    return +revenue.toFixed(2);
}

function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;

    if (index === 0) return profit * 0.15;
    if (index === 1 || index === 2) return profit * 0.1;
    if (index === total - 1) return 0;
    return profit * 0.05;
}

function calculateSimpleProfit(purchase, _product) {
    const { discount, sale_price, quantity = 0 } = purchase;
    return (
        sale_price * (1 - discount / 100) * quantity -
        _product.purchase_price * quantity
    );
}

function analyzeSalesData(
    data,
    optionsOrCalcRevenue,
    calcBonusArg,
    calcProfitArg
) {
    if (
        !data ||
        !Array.isArray(data.sellers) ||
        !Array.isArray(data.products) ||
        !Array.isArray(data.purchase_records)
    ) {
        throw new Error("Некорректные входные данные");
    }

    let calcRevenueFn;
    let calcBonusFn;
    let calcProfitFn;

    if (
        optionsOrCalcRevenue &&
        typeof optionsOrCalcRevenue === "object" &&
        !Array.isArray(optionsOrCalcRevenue)
    ) {
        calcRevenueFn = optionsOrCalcRevenue.calculateSimpleRevenue;
        calcBonusFn = optionsOrCalcRevenue.calculateBonusByProfit;
        calcProfitFn = optionsOrCalcRevenue.calculateSimpleProfit;
    } else {
        calcRevenueFn = optionsOrCalcRevenue;
        calcBonusFn = calcBonusArg;
        calcProfitFn = calcProfitArg;
    }

    if (
        typeof calcRevenueFn !== "function" ||
        typeof calcBonusFn !== "function" ||
        typeof calcProfitFn !== "function"
    ) {
        throw new Error("Некорректные опции");
    }

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

    for (const rec of data.purchase_records) {
        const stat = sellerStat[rec.seller_id];
        if (!stat) continue;

        stat.sales_count++;

        for (const item of rec.items) {
            const product = itemIndex[item.sku];
            if (!product) continue;

            stat.products_sold[item.sku] =
                (stat.products_sold[item.sku] ?? 0) + item.quantity;

            stat.revenue += calcRevenueFn(item, product);
            stat.profit += calcProfitFn(item, product);
        }
    }


    const sellerStatSorted = Object.values(sellerStat).sort(
        (a, b) => b.profit - a.profit
    );

    sellerStatSorted.forEach((seller, index) => {
        seller.bonus = calcBonusFn(index, sellerStatSorted.length, seller);

        seller.top_products = Object.entries(seller.products_sold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([sku, quantity]) => ({ sku, quantity }));
    });

    return sellerStatSorted.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}

if (typeof module !== "undefined") {
    module.exports = {
        calculateSimpleRevenue,
        calculateBonusByProfit,
        calculateSimpleProfit,
        analyzeSalesData
    };
}
