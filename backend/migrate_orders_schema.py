from app.database import Base, engine
from app.models import Customer, Product, User
from app.models.order import Order, OrderItem

Base.metadata.create_all(bind=engine)
print("Orders schema migration completed.")
