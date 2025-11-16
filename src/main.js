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
    // 1. Проверяем сами данные
    if (
        !data ||
        !Array.isArray(data.sellers) ||
        !Array.isArray(data.products) ||
        !Array.isArray(data.purchase_records)
    ) {
        throw new Error("Некорректные входные данные");
    }

    // 2. Разбираем, как нам передали функции
    let calcRevenueFn;
    let calcBonusFn;
    let calcProfitFn;

    // Вариант: три позиционных аргумента
    if (typeof optionsOrCalcRevenue === "function") {
        calcRevenueFn = optionsOrCalcRevenue;
        if (typeof calcBonusArg === "function") {
            calcBonusFn = calcBonusArg;
        }
        if (typeof calcProfitArg === "function") {
            calcProfitFn = calcProfitArg;
        }
    }
    // Вариант: объект опций
    else if (
        optionsOrCalcRevenue &&
        typeof optionsOrCalcRevenue === "object" &&
        !Array.isArray(optionsOrCalcRevenue)
    ) {
        if (typeof optionsOrCalcRevenue.calculateSimpleRevenue === "function") {
            calcRevenueFn = optionsOrCalcRevenue.calculateSimpleRevenue;
        }
        if (typeof optionsOrCalcRevenue.calculateBonusByProfit === "function") {
            calcBonusFn = optionsOrCalcRevenue.calculateBonusByProfit;
        }
        if (typeof optionsOrCalcRevenue.calculateSimpleProfit === "function") {
            calcProfitFn = optionsOrCalcRevenue.calculateSimpleProfit;
        }
    }

    // 3. Минимальный набор — должны быть функции выручки и бонуса.
    if (typeof calcRevenueFn !== "function" || typeof calcBonusFn !== "function") {
        throw new Error("Некорректные опции");
    }

    // 4. Функция прибыли — опциональна, если нет — берём нашу
    if (typeof calcProfitFn !== "function") {
        calcProfitFn = calculateSimpleProfit;
    }

    // 5. Индекс товаров по sku
    const itemIndex = Object.fromEntries(
        data.products.map(item => [item.sku, item])
    );

    // 6. Заготовка статистики по продавцам
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

    // 7. Обход всех записей о покупках
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

    // 8. Сортировка по прибыли
    const sellerStatSorted = Object.values(sellerStat).sort(
        (a, b) => b.profit - a.profit
    );

    // 9. Бонусы и топ-товары
    sellerStatSorted.forEach((seller, index) => {
        seller.bonus = calcBonusFn(index, sellerStatSorted.length, seller);

        seller.top_products = Object.entries(seller.products_sold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([sku, quantity]) => ({ sku, quantity }));
    });

    // 10. Финальный отчёт с округлением
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
