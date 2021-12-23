const hallModel = require('../models/diningHall.model');
const dishModel = require('../models/dish.model.js');
const axios = require('axios');
const cheerio = require('cheerio');

const iconMap = {
    "V":"vegetarian",
    "VG":"vegan",
    "AGTN":"gluten",
    "AMLK":"dairy",
    "APNT":"peanuts",
    "ATNT":"tree nuts",
    "AWHT":"wheat",
    "ASOY":"soy",
    "AEGG":"egg",
    "ACSF":"crustacean shellfish",
    "AFSH":"fish",
    "HAL":"halal",
    "LC":"low carbon footprint",
    "HC":"high carbon footprint"
}

const getCals = (async (dishpage) => {
    let calories = -1;

    await axios.get(dishpage)
    .then(response => {
        if (response.status != 200)
            return;
        const $ = cheerio.load(response.data);
        const cals = parseInt($('.nfcal').text().trim().split(' ')[1]);
        calories = cals;
    })
    .catch(err => console.log(err))

    return calories;
})

const getTags = (($, el) => {
    let tags = [];
    const icons = $(el).find('.menu-item-webcodes').find('.webcode-20px');
    icons.each((j, icon) => {
        tags.push(iconMap[$(icon).attr('alt')]);
    });
    return tags;
})

const scraper = async (hall) => {
    await axios.get('https://menu.dining.ucla.edu/Menus/' + hall.scrapeRoute)
    .then(async response => {
        if (response.status != 200) {
            return;
        }
        const $ = cheerio.load(response.data);
        //console.log('https://menu.dining.ucla.edu/Menus/' + hall.scrapeRoute)
        await Promise.all($('div .menu-item').map(async (i, el) => {
            const item = $(el).find('.menu-item-name');
            const name = item.text().trim();
            const link = item.find('.recipelink').attr('href');
            if (link == undefined) {
                return;
            }
            const cals = await getCals(link);
            const tags = getTags($, el);

            //PUSH ONTO DATABASE
            const newDish = new dishModel({name:name, calories:cals, tags:tags, hall:hall.name});
            newDish.save()
            .then(async () => {
                hall.menu.push({dishName:name, calories:cals, tags:tags});
            })
            .catch((err) => console.log(err))
        }))
    })
    hall.save();
}

module.exports = scraper;