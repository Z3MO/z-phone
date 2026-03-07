fx_version 'cerulean'
game 'gta5'

author 'Z3MO'
description 'A Phone for Cosmos'

ui_page 'html/index.html'

shared_scripts {
    'config.lua',
    --'@qb-apartments/config.lua',
    '@z-garages/config.lua',
    '@ox_lib/init.lua',
}

client_scripts {
    'client/*.lua',
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/*.lua',
}

files {
    'html/*.html',
    'html/js/*.js',
    'html/js/core/*.js',
    'html/img/*.png',
    'html/img/*.svg',
    'html/css/*.css',
    'html/css/core/*.css',
    'html/img/backgrounds/*.png',
    'html/img/apps/*.png',
    'html/img/apps/*.svg',
}

lua54 'yes'

dependency 'qb-target'

provide 'qb-phone'
