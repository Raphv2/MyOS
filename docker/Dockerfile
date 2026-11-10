# Serveur de test local proche de Hostinger : PHP 8.3 + Apache avec .htaccess actifs.
FROM php:8.3-apache

RUN docker-php-ext-install pdo_mysql \
 && a2enmod rewrite headers expires deflate mime \
 && sed -ri 's!AllowOverride None!AllowOverride All!g' /etc/apache2/apache2.conf \
 && mkdir -p /var/www/myos-storage \
 && chown www-data:www-data /var/www/myos-storage \
 && printf 'upload_max_filesize=256M\npost_max_size=260M\nmemory_limit=256M\nexpose_php=Off\n' \
      > /usr/local/etc/php/conf.d/myos.ini
