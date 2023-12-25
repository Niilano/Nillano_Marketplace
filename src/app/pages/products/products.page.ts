import {
  Component,
  OnInit,
} from '@angular/core';
import { FilterComponent } from 'src/app/components/filter/filter.component';
import {
  ModalController,
  NavController,
  PopoverController,
  ToastController,
} from '@ionic/angular';
import { Store } from '@ngrx/store';
import {
  clearFilter,
  filterProducts,
  getProducts,
} from 'src/app/store/products/products.action';
import { AppState } from 'src/app/types/AppState';
import { endLoading, startLoading } from 'src/app/store/loading/loading.action';
import { ProductsserviceService } from 'src/app/services/productsservice/productsservice.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, take } from 'rxjs';
import { SearchComponent } from 'src/app/components/search/search.component';

@Component({
  selector: 'app-products',
  templateUrl: './products.page.html',
  styleUrls: ['./products.page.scss'],
})
export class ProductsPage implements OnInit {

  // Page Subscribtions
  private subscriptions: Subscription[] = [];

  pageTitle = "products";

  handleRefresh(event: any) {
    // do some work to refresh the content here
    // ...

    location.reload();

    // when the refresh is complete, call the complete() method
    setTimeout(() => {
      event.target.complete();
    }, 1500);
  }

  products: any = [];
  categoriesAndSubcategories: any = [];

  productsAvailable: any;

  selectedCategory: any;
  selectedSubcategory: any;
  priceRange: any;

  masonry: any;

  navigateToProductDetails(productId: string) {
    this.navCtrl.navigateForward('/product-details', {
      queryParams: { product: productId },
    });
  }


  constructor(
    private popoverController: PopoverController,
    private store: Store<AppState>,
    private productsService: ProductsserviceService,
    private toastController: ToastController,
    private activatedRoute: ActivatedRoute,
    private modalCtrl: ModalController,
    private router: Router,
    private navCtrl: NavController
  ) { }

  getProducts = false;
  getProductsComplete = false;
  filteringProducts = false

  ngOnInit() {
    // console.log('init');

    // Getting all avialable categories and subcategories
    this.productsService
      .getCategoriesAndSubCategoies()
      .pipe(take(1))
      .subscribe(
        (res) => {
          this.categoriesAndSubcategories = res;

          // this.activatedRoute.queryParams.pipe(take(1)).subscribe((params) => {
          //   if (params['openFilter']) {
          //     this.openFilter();
          //   }
          // });
        },
        (err) => {
          console.log(err);
        }
      );

    // Getting the states of the products at each time
    this.subscriptions.push(
      this.store.select('products').subscribe((res) => {

        if (!res.filter && !this.getProducts) {
          this.getProducts = true;
          if (res.products.length < 1) {
            this.store.dispatch(getProducts({ page: 1 }));
          }
        } else if (res.filter) {
          this.getProducts = false;
        }

        if (!res.filter && res.process) {
          this.getProductsComplete = false
          this.products.length < 1 && this.store.dispatch(startLoading());
        } else if (res.filter && res.process) {
          this.getProducts = true
          this.store.dispatch(startLoading());
        }

        if (!res.filter && res.success) {

          this.store.dispatch(endLoading());
          // console.log(res.products)
          this.products =
            this.products.length > 0
              ? [...this.products, ...res.products]
              : res.products;

          this.productsAvailable = res.productsAvailable;
          this.getProductsComplete = true
          this.filteringProducts = false
        } else if (res.filter && res.success) {

          this.getProducts = true;
          this.filteringProducts = true

          this.store.dispatch(endLoading());
          // console.log(res.products)
          this.products = res.products;

          this.productsAvailable = res.productsAvailable;
          this.getProductsComplete = true
        }

        if (res.failure) {
          this.store.dispatch(endLoading());

          // console.log(res.message)

          this.toastController
            .create({
              message: res.message
                ? res.message
                : "Sorry, we're unable to retrieve products at the moment. Please try again later.",
              color: 'danger',
              position: 'bottom',
              cssClass: 'flex-contianer',
              buttons: [
                {
                  text: 'Retry',
                  handler: () => {
                    this.store.dispatch(getProducts({ page: 1 }));
                    this.productsService
                      .getCategoriesAndSubCategoies()
                      .pipe(take(1))
                      .subscribe(
                        (res) => {
                          this.categoriesAndSubcategories = res;
                        },
                        (err) => {
                          console.log(err);
                        }
                      );
                  },
                },
              ],
            })
            .then((toast) => toast.present());
        }

      }))
  }

  loadMoreProducts(event: any) {
    // Fetch more products from your database or service

    let nextPage: number = Number(localStorage.getItem('currentPage'));

    if (this.getProducts) {
      this.store.dispatch(getProducts({ page: nextPage + 1 }));
    }

    setTimeout(() => {
      event.target.complete();
    }, 500);
  }

  async searchI() {
    const modal = await this.modalCtrl.create({
      component: SearchComponent,
      showBackdrop: true,
    });
    return await modal.present();
  }

  async openFilter() {

    const modal = await this.modalCtrl.create({
      component: FilterComponent,
      showBackdrop: true,
      componentProps: {
        selectedCategory: this.selectedCategory,
        selectedSubcategory: this.selectedSubcategory,
        priceRange: this.priceRange,
        categoriesAndSubcategories: this.categoriesAndSubcategories,
      }
    });

    modal.onDidDismiss().then((data) => {
      // Check if data returned has a value

      if (!data.data.selectedCategory && !data.data.selectedSubCategory && !data.data.priceRange.des) {
        // console.log('nothing')
        this.products = []
        this.selectedCategory = data.data.selectedCategory
        this.selectedSubcategory = data.data.selectedSubCategory
        this.priceRange = data.data.priceRange
        this.store.dispatch(clearFilter());
        return
      }

      // console.log('Data received from FilterComponent:', data.data);
      this.selectedCategory = data.data.selectedCategory
      this.selectedSubcategory = data.data.selectedSubCategory
      this.priceRange = data.data.priceRange

      this.store.dispatch(
        filterProducts({
          filters: {
            category: data.data.selectedCategory,
            subcategory: data.data.selectedSubCategory,
            priceRange: JSON.stringify(data.data.priceRange),
          },
        })
      );

    }
    );

    return await modal.present();

  }

  resetFilter() {
    this.products = []
    this.selectedCategory = undefined
    this.selectedSubcategory = undefined
    this.priceRange = undefined
    this.store.dispatch(clearFilter());
  }

  // Method to calculate the discounted price
  calculateDiscountedPrice(price: string, discountPercentage: string): number {
    const originalPrice = parseFloat(price);
    const discount = parseFloat(discountPercentage);
    const discountAmount = (discount / 100) * originalPrice;
    const discountedPrice = originalPrice - discountAmount;
    return discountedPrice;
  }

  modifyImageUrl(url: string): string {
    if (url) {
      // Transform the URL to HTTPS if it's a Cloudinary URL and not already HTTPS
      if (url.startsWith('http:')) {
        url = 'https://' + url.substr(7); // Replaces 'http://' with 'https://'
      }

      // Split the URL at 'upload/'
      let parts = url.split('upload/');

      if (parts.length === 2) {
        // Add 'w_500' between the two parts and create the new URL
        let newImageUrl = parts[0] + 'upload/w_500/' + parts[1];
        return newImageUrl; // The modified URL with 'w_500'
      }


    }

    return url ? url : 'https://ionicframework.com/docs/img/demos/thumbnail.svg';
  }

  // Smooth loading of products images
  onImageLoad(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.classList.add('loaded');
  }

  ionViewDidEnter() {
    // console.log("Entered")
    // setTimeout(() => {
    //   let products = document.querySelector('.products') as HTMLElement
    //   let masonry = new Masonry(products, {
    //     itemSelector: '.product-item'
    //   })
    //   console.log("timer working")
    // }, 2000);
  }

  ngAfterViewInit() {
    // window.addEventListener('load',()=>{
    //   let products = document.querySelector('.products') as HTMLElement
    // this.masonry = new Masonry(products,{
    //   itemSelector : '.product-item'
    // })
    // })
  }
}
