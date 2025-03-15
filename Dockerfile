FROM postgres:14

# Configure PostgreSQL to listen on a different port
ENV POSTGRES_PASSWORD=postgres
ENV POSTGRES_USER=postgres
ENV POSTGRES_DB=brothers_lodge

# The default port for PostgreSQL is 5432, we're changing the exposed port to 5433
EXPOSE 5433

# We need to modify the postgresql.conf file to listen on port 5433
RUN echo "port = 5433" >> /usr/share/postgresql/postgresql.conf.sample

CMD ["postgres", "-c", "config_file=/usr/share/postgresql/postgresql.conf.sample"] 